import { getSql } from '../../../../lib/db';
import { addDays, isUuid, jsonError, sameOrigin, sessionUserId, todayKst } from '../../../../lib/api';
import { CYCLE_OPTIONS, MAX_QTY_SUBSCRIBE, MIN_SUBSCRIPTION_CHARGES } from '../../../../lib/catalog';
import { getAddress } from '../../../../lib/addresses';
import { chargeSubscription, getSubscription, inMinimumPeriod, listSubscriptions, markCharged } from '../../../../lib/subscriptions';
import { enqueue } from '../../../../lib/notify';

export const runtime = 'edge';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);
    const { id } = await ctx.params;
    if (!isUuid(id)) return jsonError('Not Found', 404);

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    const sub = await getSubscription(id, userId);
    if (!sub) return jsonError('Not Found', 404);
    if (sub.status === 'canceled') return jsonError('이미 해지된 구독이에요', 409);

    const sql = getSql();
    const tomorrow = todayKst(1);
    const inMin = inMinimumPeriod(sub);
    const minMsg = `최소 이용기간(${MIN_SUBSCRIPTION_CHARGES}회 결제) 중에는 할 수 없어요. 지금까지 ${sub.paidCount}회 결제됐어요.`;
    const done = async (extra: Record<string, unknown> = {}) =>
        Response.json({ subscriptions: await listSubscriptions(userId), ...extra });

    switch (body.action) {
        case 'pause': {
            if (inMin) return jsonError(`일시정지는 ${minMsg}`, 409);
            if (sub.status !== 'active') return jsonError('이용 중인 구독만 일시정지할 수 있어요', 409);
            await sql`update subscriptions set status = 'paused', updated_at = now() where id = ${id}`;
            await enqueue('subscription_paused', { subscriptionId: id, reason: '고객 요청' }, { userId, customer: false });
            return done();
        }
        case 'resume': {
            if (sub.status !== 'paused' && sub.status !== 'past_due') return jsonError('재개할 수 있는 상태가 아니에요', 409);
            const next = sub.nextBillingDate > tomorrow ? sub.nextBillingDate : tomorrow;
            await sql`update subscriptions set status = 'active', fail_count = 0, next_billing_date = ${next}, updated_at = now() where id = ${id}`;
            return done();
        }
        case 'cancel': {
            if (inMin) {
                // Minimum period: the cancellation is booked and takes effect once the minimum has been paid.
                if (!sub.cancelRequestedAt) {
                    await sql`update subscriptions set cancel_requested_at = now(), cancel_reason = '고객 해지 예약 (최소 이용기간)', updated_at = now() where id = ${id}`;
                    await enqueue('subscription_cancel_requested', { subscriptionId: id, nextDate: sub.nextBillingDate }, { userId });
                }
                return done({ scheduled: true });
            }
            const reason = typeof body.reason === 'string' ? body.reason.slice(0, 200) : '고객 해지';
            await sql`update subscriptions set status = 'canceled', canceled_at = now(), cancel_reason = ${reason}, updated_at = now() where id = ${id}`;
            await enqueue('subscription_canceled', { subscriptionId: id, reason }, { userId });
            return done();
        }
        case 'cancel_undo': {
            if (!sub.cancelRequestedAt) return jsonError('예약된 해지가 없어요', 409);
            await sql`update subscriptions set cancel_requested_at = null, cancel_reason = null, updated_at = now() where id = ${id}`;
            return done();
        }
        case 'skip': {
            if (body.value !== false && inMin) return jsonError(`건너뛰기는 ${minMsg}`, 409);
            if (sub.status !== 'active') return jsonError('이용 중인 구독만 건너뛸 수 있어요', 409);
            await sql`update subscriptions set skip_next = ${body.value !== false}, updated_at = now() where id = ${id}`;
            return done();
        }
        case 'set_cycle': {
            const days = Number(body.cycleDays);
            if (!CYCLE_OPTIONS.includes(days)) return jsonError('선택할 수 없는 주기예요');
            const base = (sub.lastBilledAt ?? sub.createdAt).slice(0, 10);
            const candidate = addDays(base, days);
            const next = candidate > tomorrow ? candidate : tomorrow;
            const lines = sub.lines.map((l) => ({ ...l, cycleDays: days }));
            await sql`update subscriptions set cycle_days = ${days}, items = ${JSON.stringify(lines)}::jsonb,
                      next_billing_date = ${next}, updated_at = now() where id = ${id}`;
            return done();
        }
        case 'set_next_date': {
            const date = String(body.date ?? '');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < tomorrow || date > addDays(tomorrow, 90)) {
                return jsonError('내일부터 90일 이내의 날짜를 선택해 주세요');
            }
            await sql`update subscriptions set next_billing_date = ${date}, updated_at = now() where id = ${id}`;
            return done();
        }
        case 'set_qty': {
            const index = Number(body.index);
            const qty = Math.floor(Number(body.qty));
            if (!Number.isInteger(index) || index < 0 || index >= sub.lines.length) return jsonError('잘못된 요청이에요');
            if (!(qty >= 1 && qty <= MAX_QTY_SUBSCRIBE)) return jsonError(`수량은 1~${MAX_QTY_SUBSCRIBE}개까지 선택할 수 있어요`);
            const lines = sub.lines.map((l, i) => (i === index ? { ...l, qty } : l));
            await sql`update subscriptions set items = ${JSON.stringify(lines)}::jsonb, updated_at = now() where id = ${id}`;
            return done();
        }
        case 'set_address': {
            if (!isUuid(body.addressId)) return jsonError('배송지를 선택해 주세요');
            const a = await getAddress(userId, body.addressId);
            if (!a) return jsonError('배송지를 찾을 수 없어요');
            await sql`update subscriptions set ship_name = ${a.recipient}, ship_phone = ${a.phone}, ship_zip = ${a.zipcode},
                      ship_address1 = ${a.address1}, ship_address2 = ${a.address2}, updated_at = now() where id = ${id}`;
            return done();
        }
        case 'set_payment_method': {
            if (!isUuid(body.paymentMethodId)) return jsonError('결제 카드를 선택해 주세요');
            const m = await sql`select 1 from payment_methods where id = ${body.paymentMethodId} and user_id = ${userId}`;
            if (m.length === 0) return jsonError('결제 카드를 찾을 수 없어요');
            await sql`update subscriptions set payment_method_id = ${body.paymentMethodId}, updated_at = now() where id = ${id}`;
            return done();
        }
        case 'retry_now': {
            if (sub.status !== 'past_due' && !(sub.status === 'active' && sub.failCount > 0)) {
                return jsonError('지금 결제할 수 있는 상태가 아니에요', 409);
            }
            const result = await chargeSubscription(sub);
            if (!result.ok) return Response.json({ error: result.message, subscriptions: await listSubscriptions(userId) }, { status: 402 });
            await markCharged(sub);
            await enqueue('subscription_charged', { subscriptionId: id, orderNo: result.order.orderNo, amount: result.order.amount }, { userId });
            return done({ orderNo: result.order.orderNo });
        }
        default:
            return jsonError('알 수 없는 요청이에요');
    }
}
