/**
 * Payment safety tests, against a TEST database and a fake Toss server (no real card is ever charged).
 *
 *   npx tsx scripts/test-payment-safety.ts
 *
 * Needs DATABASE_URL_TEST in .env.local (a Neon branch, schema only). Stops at once if it is missing or points at
 * the same database as DATABASE_URL. Toss keys are replaced by dummies and requests go to a local fake server;
 * mail / push keys are removed, so notifications are only queued in the test database.
 *
 * Scenarios
 *  A. recurring charge approved but the answer is lost, and the lookup fails too -> 결제 확인 중 -> the retry finds it
 *  B. first charge (with coupon) unclear and lookup fails -> 결제 확인 중 -> the job confirms it later
 *  C. the same round charged twice at the same moment
 *  D. card declined (clear failure) -> the retry uses a new order number / key and is approved
 *  E. one-time (widget) payment: confirm gets a server error after approving, lookup fails -> 확인 중 -> settled
 * Pass: per round exactly one approved payment; coupon use, paid count and next billing date each updated once.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

// ---------- environment: test database only ----------
const envText = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const envVal = (k: string) => envText.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const prodUrl = envVal('DATABASE_URL');
const testUrl = envVal('DATABASE_URL_TEST');
const hostOf = (u?: string) => {
    try {
        const x = new URL(u ?? '');
        return `${x.hostname.replace('-pooler', '')}/${x.pathname}`;
    } catch {
        return '';
    }
};
if (!testUrl) {
    console.error('STOP: DATABASE_URL_TEST is not set in .env.local');
    process.exit(2);
}
if (!hostOf(testUrl) || hostOf(testUrl) === hostOf(prodUrl)) {
    console.error('STOP: DATABASE_URL_TEST points at the production database (or is invalid)');
    process.exit(2);
}
process.env.DATABASE_URL = testUrl;
process.env.TOSS_API_SECRET_KEY = 'test_sk_dummy_api';
process.env.TOSS_WIDGET_SECRET_KEY = 'test_sk_dummy_widget';
process.env.BILLING_ENC_KEY = envVal('BILLING_ENC_KEY') ?? 'x'.repeat(44);
process.env.AUTH_SECRET = 'test-secret';
for (const k of ['BREVO_API_KEY', 'EMAIL_FROM', 'VAPID_PRIVATE_KEY', 'VAPID_PUBLIC_KEY', 'ADMIN_WEBHOOK_URL', 'TELEGRAM_BOT_TOKEN']) delete process.env[k];

const sql = neon(testUrl);

// ---------- fake Toss ----------
type Mode = 'ok' | 'drop-after-approve' | 'decline' | 'error500-after-approve';
const mock = {
    chargeMode: 'ok' as Mode,
    lookupFails: false,
    delayMs: 0,
    payments: new Map<string, { paymentKey: string; orderId: string; status: string; totalAmount: number; method: string; card: { company: string; number: string } }>(),
    byKey: new Map<string, string>(), // paymentKey -> orderId
    idem: new Map<string, { status: number; body: unknown }>(),
    approvals: 0,
    keysSeen: [] as string[],
};
function approve(orderId: string, amount: number, paymentKey = `pk_${orderId}`) {
    const p = { paymentKey, orderId, status: 'DONE', totalAmount: amount, method: '카드', card: { company: '테스트카드', number: '1234****5678' } };
    mock.payments.set(orderId, p);
    mock.byKey.set(paymentKey, orderId);
    mock.approvals++;
    return p;
}
const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
        const body = raw ? JSON.parse(raw) : {};
        const send = (status: number, data: unknown) => {
            res.writeHead(status, { 'content-type': 'application/json' });
            res.end(JSON.stringify(data));
        };
        const url = req.url ?? '';
        const idemKey = req.headers['idempotency-key'] as string | undefined;
        if (mock.delayMs) await new Promise((r) => setTimeout(r, mock.delayMs));

        if (req.method === 'GET') {
            if (mock.lookupFails) return send(500, { code: 'FAILED_INTERNAL_SYSTEM_PROCESSING', message: 'lookup down' });
            const m1 = url.match(/^\/v1\/payments\/orders\/(.+)$/);
            const m2 = url.match(/^\/v1\/payments\/(.+)$/);
            const orderId = m1 ? decodeURIComponent(m1[1]) : m2 ? mock.byKey.get(decodeURIComponent(m2[1])) : undefined;
            const p = orderId ? mock.payments.get(orderId) : undefined;
            return p ? send(200, p) : send(404, { code: 'NOT_FOUND_PAYMENT', message: 'not found' });
        }

        // POST: billing charge or widget confirm
        if (idemKey) mock.keysSeen.push(idemKey);
        if (idemKey && mock.idem.has(idemKey)) {
            const prev = mock.idem.get(idemKey)!;
            return send(prev.status, prev.body);
        }
        const orderId: string = body.orderId;
        const amount: number = body.amount;
        const paymentKey: string | undefined = body.paymentKey;
        if (mock.payments.has(orderId)) return send(400, { code: 'ALREADY_PROCESSED_PAYMENT', message: 'already' });
        switch (mock.chargeMode) {
            case 'ok': {
                const p = approve(orderId, amount, paymentKey);
                if (idemKey) mock.idem.set(idemKey, { status: 200, body: p });
                return send(200, p);
            }
            case 'drop-after-approve': {
                const p = approve(orderId, amount, paymentKey);
                if (idemKey) mock.idem.set(idemKey, { status: 200, body: p });
                req.socket.destroy(); // the answer never arrives
                return;
            }
            case 'error500-after-approve': {
                approve(orderId, amount, paymentKey);
                return send(500, { code: 'FAILED_INTERNAL_SYSTEM_PROCESSING', message: 'internal' });
            }
            case 'decline': {
                const b = { code: 'REJECT_CARD_PAYMENT', message: '한도초과 혹은 잔액부족으로 결제에 실패했습니다.' };
                if (idemKey) mock.idem.set(idemKey, { status: 403, body: b });
                return send(403, b);
            }
        }
    });
});

// ---------- helpers ----------
let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
    console.log(`${cond ? '  ✓' : '  ✗'} ${label}${cond ? '' : `  -> ${JSON.stringify(detail)}`}`);
    if (!cond) failures++;
}
const one = async <T = Record<string, unknown>>(q: Promise<unknown>) => ((await q) as T[])[0];

async function main() {
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as { port: number }).port;
    process.env.TOSS_API_BASE = `http://127.0.0.1:${port}`;

    // migration on the test database
    const mig = fs.readFileSync(path.join(process.cwd(), 'db/payment-safety.sql'), 'utf8');
    for (const stmt of mig.split(/;\s*(?:\r?\n|$)/).map((s) => s.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean)) await sql.query(stmt);

    const { encryptSecret } = await import('../src/lib/crypto');
    const subs = await import('../src/lib/subscriptions');
    const { finalizeWidgetPayment } = await import('../src/lib/payments');
    const { settleUnclearPayments } = await import('../src/lib/payment-settle');
    const { todayKst, addDays } = await import('../src/lib/dates');

    // fixtures
    const u = await one<{ id: string }>(sql`insert into users (name, email, terms_agreed_at, privacy_agreed_at) values ('결제테스트', 'pay-test@example.invalid', now(), now()) returning id`);
    const pm = await one<{ id: string }>(sql`insert into payment_methods (user_id, billing_key_enc, card_company, card_number, is_default)
        values (${u.id}, ${await encryptSecret('bk_test')}, '테스트카드', '1234****5678', true) returning id`);
    const items = JSON.stringify([{ sku: 'bundle:20', qty: 1, mode: 'subscribe', cycleDays: 30, mix: 'all' }]);
    const newSub = async (paidCount: number) =>
        one<{ id: string }>(sql`insert into subscriptions (user_id, status, items, cycle_days, next_billing_date, payment_method_id, paid_count,
            ship_name, ship_phone, ship_zip, ship_address1, ship_address2)
            values (${u.id}, 'active', ${items}::jsonb, 30, ${todayKst()}, ${pm.id}, ${paidCount}, '홍길동', '010-0000-0000', '12345', '테스트로 1', '101호') returning id`);
    const roundOrders = (subId: string, round: number) => sql`select order_no, status from orders where subscription_id = ${subId} and charge_no = ${round} order by created_at`;
    const subRow = (id: string) => one<{ paid_count: number; next_billing_date: string; fail_count: number; status: string }>(sql`select paid_count, next_billing_date::text, fail_count, status from subscriptions where id = ${id}`);
    const notes = async (event: string, subId: string) =>
        Number((await one<{ n: string }>(sql`select count(*) n from notifications where channel = 'email' and event = ${event} and payload->>'subscriptionId' = ${subId}`)).n);
    const reset = () => {
        mock.chargeMode = 'ok';
        mock.lookupFails = false;
        mock.delayMs = 0;
        mock.approvals = 0;
        mock.keysSeen = [];
    };

    // ---------- A ----------
    console.log('\nA. 승인 직후 응답 끊김 + 조회 실패 -> 재시도에서 확인');
    reset();
    const a = await newSub(1);
    mock.chargeMode = 'drop-after-approve';
    mock.lookupFails = true;
    const a1 = await subs.processDueSubscription(a.id);
    check('첫 실행: 결제 확인 중', a1.outcome === 'checking', a1);
    check('주문이 checking 상태', (await roundOrders(a.id, 2))[0]?.status === 'checking', await roundOrders(a.id, 2));
    check('결제 횟수·다음 결제일 그대로', (await subRow(a.id)).paid_count === 1 && (await subRow(a.id)).next_billing_date === todayKst());
    mock.lookupFails = false;
    mock.chargeMode = 'ok';
    const a2 = await subs.processDueSubscription(a.id);
    check('재시도: 기존 결제를 찾아 완료', a2.outcome === 'charged', a2);
    const aOrders = (await roundOrders(a.id, 2)) as { status: string }[];
    check('2회차 승인 주문 1건 (새 주문 없음)', aOrders.length === 1 && aOrders[0].status === 'paid', aOrders);
    check('결제사 승인 1건', mock.approvals === 1, mock.approvals);
    const aRow = await subRow(a.id);
    check('결제 횟수 1 증가, 다음 결제일 갱신', aRow.paid_count === 2 && aRow.next_billing_date === addDays(todayKst(), 30), aRow);
    await subs.processDueSubscription(a.id);
    check('다시 돌려도 변화 없음', (await subRow(a.id)).paid_count === 2 && mock.approvals === 1);
    check('결제 완료 알림 1건', (await notes('subscription_charged', a.id)) === 1);

    // ---------- B ----------
    console.log('\nB. 첫 결제(쿠폰) 조회까지 실패 -> 확인 중 -> 나중에 승인 확인');
    reset();
    const cp = await one<{ id: string }>(sql`insert into coupons (user_id, source, name, amount, min_order, expires_at) values (${u.id}, 'test', '테스트쿠폰', 3000, 0, now() + interval '30 days') returning id`);
    mock.chargeMode = 'drop-after-approve';
    mock.lookupFails = true;
    const b1 = await subs.startSubscription({
        userId: u.id,
        lines: [{ sku: 'bundle:20', qty: 1, mode: 'subscribe', cycleDays: 30, mix: 'all' }] as never,
        cycleDays: 30,
        address: { recipient: '홍길동', phone: '010-0000-0000', zipcode: '12345', address1: '테스트로 1', address2: '101호' } as never,
        paymentMethodId: pm.id,
        discount: 3000,
        couponId: cp.id,
        gift: true,
    });
    const bSub = b1.subscriptionId!;
    check('결과: 확인 중 (실패 아님)', !b1.ok && (b1 as { code: string }).code === 'CHECKING', b1);
    check('구독은 유지 (해지 안 됨), 결제 횟수 0', (await subRow(bSub)).status === 'active' && (await subRow(bSub)).paid_count === 0);
    const cHeld = await one<{ order_id: string | null; used_at: string | null }>(sql`select order_id, used_at from coupons where id = ${cp.id}`);
    check('쿠폰은 주문에 묶여 있음 (미사용)', !!cHeld.order_id && !cHeld.used_at, cHeld);
    await sql`update orders set updated_at = now() - interval '2 minutes' where subscription_id = ${bSub}`;
    mock.lookupFails = false;
    const s1 = await settleUnclearPayments();
    check('작업: 승인 확인', s1.results.some((r) => r.result === 'paid'), s1);
    const bRow = await subRow(bSub);
    check('결제 횟수 1, 다음 결제일 갱신', bRow.paid_count === 1 && bRow.next_billing_date === addDays(todayKst(), 30), bRow);
    const cUsed = await one<{ used_at: string | null }>(sql`select used_at from coupons where id = ${cp.id}`);
    check('쿠폰 사용 처리', !!cUsed.used_at);
    await sql`update orders set updated_at = now() - interval '2 minutes' where subscription_id = ${bSub}`;
    const s2 = await settleUnclearPayments();
    check('작업 다시 돌려도 처리할 것 없음', s2.processed === 0, s2);
    check('결제사 승인 1건', mock.approvals === 1, mock.approvals);
    check('구독 시작 알림 1건', (await notes('subscription_started', bSub)) === 1);
    check('보틀 증정 표시', !!(await one<{ shaker_gifted_at: string | null }>(sql`select shaker_gifted_at from users where id = ${u.id}`)).shaker_gifted_at);

    // ---------- C ----------
    console.log('\nC. 같은 회차 동시 실행');
    reset();
    const c = await newSub(0);
    const cSub = (await subs.getSubscription(c.id))!;
    mock.delayMs = 400;
    const [r1, r2] = await Promise.all([subs.chargeSubscription(cSub), subs.chargeSubscription(cSub)]);
    mock.delayMs = 0;
    check('결제사 승인 1건', mock.approvals === 1, { approvals: mock.approvals, r1, r2 });
    const [m1, m2] = await Promise.all([subs.markCharged(cSub), subs.markCharged(cSub)]);
    check('결제 횟수 갱신 1회만', [m1.counted, m2.counted].filter(Boolean).length === 1 && (await subRow(c.id)).paid_count === 1, { m1, m2 });
    const cOrders = (await roundOrders(c.id, 1)) as { status: string }[];
    check('1회차 승인 주문 1건', cOrders.filter((o) => o.status === 'paid').length === 1, cOrders);
    let dupBlocked = false;
    try {
        await sql`insert into orders (order_no, user_id, kind, subscription_id, charge_no, status, items, subtotal, shipping_fee, amount)
                  values ('DUP-TEST', ${u.id}, 'subscription', ${c.id}, 1, 'paid', '[]'::jsonb, 0, 0, 0)`;
    } catch {
        dupBlocked = true;
    }
    check('DB가 같은 회차 두 번째 승인 주문을 거부', dupBlocked);

    // ---------- D ----------
    console.log('\nD. 확정 실패(카드 거절) -> 새 키로 재시도 -> 승인');
    reset();
    const d = await newSub(1);
    mock.chargeMode = 'decline';
    const d1 = await subs.processDueSubscription(d.id);
    check('첫 시도: 실패 처리', d1.outcome === 'failed', d1);
    check('실패 1회, 3일 뒤 재시도로 미룸', (await subRow(d.id)).fail_count === 1 && (await subRow(d.id)).next_billing_date !== todayKst());
    await sql`update subscriptions set next_billing_date = ${todayKst()} where id = ${d.id}`;
    mock.chargeMode = 'ok';
    const d2 = await subs.processDueSubscription(d.id);
    check('재시도: 승인', d2.outcome === 'charged', d2);
    const dOrders = (await roundOrders(d.id, 2)) as { order_no: string; status: string }[];
    check('2회차: 실패 1건 + 승인 1건 (주문번호 다름)', dOrders.length === 2 && dOrders[0].status === 'failed' && dOrders[1].status === 'paid' && dOrders[0].order_no !== dOrders[1].order_no, dOrders);
    check('중복 방지 키도 서로 다름', new Set(mock.keysSeen).size === 2, mock.keysSeen);
    check('결제사 승인 1건', mock.approvals === 1);
    const dRow = await subRow(d.id);
    check('결제 횟수 1 증가, 실패 횟수 초기화', dRow.paid_count === 2 && dRow.fail_count === 0, dRow);

    // ---------- E ----------
    console.log('\nE. 일반 결제: 승인 후 서버 오류 + 조회 실패 -> 확인 중 -> 확정');
    reset();
    const cp2 = await one<{ id: string }>(sql`insert into coupons (user_id, source, name, amount, min_order, expires_at) values (${u.id}, 'test', '테스트쿠폰2', 2000, 0, now() + interval '30 days') returning id`);
    const eOrderNo = `TEST-E-${Date.now()}`;
    const eo = await one<{ id: string }>(sql`insert into orders (order_no, user_id, kind, status, items, subtotal, shipping_fee, amount, discount_amount, coupon_id)
        values (${eOrderNo}, ${u.id}, 'once', 'pending', '[]'::jsonb, 12000, 0, 10000, 2000, ${cp2.id}) returning id`);
    await sql`update coupons set order_id = ${eo.id} where id = ${cp2.id}`;
    mock.chargeMode = 'error500-after-approve';
    mock.lookupFails = true;
    const e1 = await finalizeWidgetPayment(u.id, { paymentKey: 'pk_widget_e', orderId: eOrderNo, amount: 10000 });
    check('결과: 확인 중 (실패 아님)', !e1.ok && !!(e1 as { checking?: boolean }).checking, e1);
    check('주문 checking, 쿠폰 묶여 있음', (await one<{ status: string }>(sql`select status from orders where id = ${eo.id}`)).status === 'checking' &&
        !(await one<{ used_at: string | null }>(sql`select used_at from coupons where id = ${cp2.id}`)).used_at);
    mock.lookupFails = false;
    await sql`update orders set updated_at = now() - interval '2 minutes' where id = ${eo.id}`;
    const s3 = await settleUnclearPayments();
    check('작업: 승인 확인', s3.results.some((r) => r.orderNo === eOrderNo && r.result === 'paid'), s3);
    const e2 = await finalizeWidgetPayment(u.id, { paymentKey: 'pk_widget_e', orderId: eOrderNo, amount: 10000 });
    check('결과 화면 새로고침: 완료로 보임, 재청구 없음', e2.ok && mock.approvals === 1, { e2ok: e2.ok, approvals: mock.approvals });
    check('쿠폰 사용 처리', !!(await one<{ used_at: string | null }>(sql`select used_at from coupons where id = ${cp2.id}`)).used_at);
    check('주문 완료 알림 1건', Number((await one<{ n: string }>(sql`select count(*) n from notifications where channel = 'email' and event = 'order_paid' and payload->>'orderNo' = ${eOrderNo}`)).n) === 1);

    // cleanup (test database)
    await sql`delete from notifications where user_id = ${u.id}`;
    await sql`delete from billing_attempts where subscription_id in (select id from subscriptions where user_id = ${u.id})`;
    await sql`delete from coupons where user_id = ${u.id}`;
    await sql`delete from orders where user_id = ${u.id}`;
    await sql`delete from subscriptions where user_id = ${u.id}`;
    await sql`delete from users where id = ${u.id}`;

    server.close();
    console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} CHECK(S) FAILED`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    server.close();
    process.exit(1);
});
