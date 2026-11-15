// App notifications (web push, RFC 8291 + VAPID). Server only.
// Works for Android browsers and the home-screen app, and for iPhone only from the home-screen app (iOS 16.4+).
// Order / delivery notices only; event / benefit pushes would additionally need users.marketing_agreed and the
// night-time rule (no ads 21:00-08:00 without a separate consent) - none are sent yet.
import { buildPushPayload, type PushSubscription, type VapidKeys } from '@block65/webcrypto-web-push';
import { getSql } from './db';
import type { NotifyEvent } from './notify';

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://chamoatcare.com';
const won = (v: unknown) => `${Number(v ?? 0).toLocaleString('ko-KR')}원`;

function vapid(): VapidKeys | null {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return null;
    return { publicKey, privateKey, subject: process.env.VAPID_SUBJECT || 'https://chamoatcare.com' };
}

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? null;

export async function savePushSubscription(userId: string, sub: PushSubscription, userAgent: string | null): Promise<void> {
    await getSql()`
        insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
        values (${userId}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${userAgent?.slice(0, 300) ?? null})
        on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth
    `;
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
    await getSql()`delete from push_subscriptions where user_id = ${userId} and endpoint = ${endpoint}`;
}

export async function hasPush(userId: string): Promise<boolean> {
    try {
        const r = await getSql()`select 1 from push_subscriptions where user_id = ${userId} limit 1`;
        return r.length > 0;
    } catch {
        return false;
    }
}

/** Events that become an app notification (order / delivery; no ads). */
export const PUSH_EVENTS: ReadonlySet<NotifyEvent> = new Set<NotifyEvent>([
    'order_paid',
    'order_canceled',
    'order_shipped',
    'subscription_started',
    'subscription_charged',
    'subscription_charge_failed',
    'billing_upcoming',
    'return_approved',
    'return_rejected',
    'return_completed',
    'inquiry_answered',
]);

export interface PushText {
    title: string;
    body: string;
    url: string;
    tag?: string;
}

/** Short notification text per event (the email carries the details). */
export function pushMessage(event: NotifyEvent, p: Record<string, unknown>): PushText | null {
    const order = p.orderNo ? `/mypage/orders/${p.orderNo}` : '/mypage/orders';
    switch (event) {
        case 'order_paid':
            return { title: '주문이 완료됐어요', body: `결제 ${won(p.amount)} · 발송 준비를 시작할게요`, url: order, tag: `order-${p.orderNo}` };
        case 'order_canceled':
            return { title: '주문이 취소됐어요', body: `${won(p.amount)}이 환불돼요 (카드사에 따라 3~5일)`, url: order, tag: `order-${p.orderNo}` };
        case 'order_shipped':
            return { title: '🚚 상품이 출발했어요', body: p.carrier ? `${p.carrier} ${p.trackingNo ?? ''} · 눌러서 배송 확인` : '눌러서 배송을 확인하세요', url: order, tag: `order-${p.orderNo}` };
        case 'subscription_started':
            return { title: '정기구독이 시작됐어요', body: '첫 회 상품을 준비할게요', url: '/mypage/subscription' };
        case 'subscription_charged':
            return { title: '정기구독 결제가 완료됐어요', body: `${won(p.amount)} · 발송 준비를 시작할게요`, url: '/mypage/subscription' };
        case 'subscription_charge_failed':
            return { title: '정기구독 결제에 실패했어요', body: '결제 카드를 확인해 주세요', url: '/mypage/payment' };
        case 'billing_upcoming':
            return { title: '정기구독 결제 예정 안내', body: `${p.date ?? '곧'} ${won(p.amount)} 결제 예정이에요 · 건너뛰기·변경은 마이페이지에서`, url: '/mypage/subscription' };
        case 'return_approved':
            return { title: '교환·반품 신청이 승인됐어요', body: '회수 일정을 확인해 주세요', url: '/mypage/returns' };
        case 'return_rejected':
            return { title: '교환·반품 신청 결과 안내', body: '사유를 확인해 주세요', url: '/mypage/returns' };
        case 'return_completed':
            return { title: '교환·반품이 완료됐어요', body: '처리 내용을 확인해 주세요', url: '/mypage/returns' };
        case 'inquiry_answered':
            return { title: '상품 문의에 답변이 달렸어요', body: '눌러서 답변을 확인하세요', url: '/mypage/inquiries' };
        default:
            return null;
    }
}

/** Send one notification to every device of the member. Gone devices (404/410) are forgotten. */
export async function sendPushTo(userId: string, msg: PushText): Promise<'sent' | 'skipped' | string> {
    const keys = vapid();
    if (!keys) return 'skipped';
    const sql = getSql();
    const subs = await sql`select id, endpoint, p256dh, auth from push_subscriptions where user_id = ${userId}`;
    if (subs.length === 0) return 'skipped';
    const data = { title: msg.title, body: msg.body, url: new URL(msg.url, SITE()).toString(), tag: msg.tag ?? null };
    let ok = 0;
    let lastError = '';
    for (const s of subs) {
        try {
            const sub: PushSubscription = { endpoint: s.endpoint as string, expirationTime: null, keys: { p256dh: s.p256dh as string, auth: s.auth as string } };
            const payload = await buildPushPayload({ data, options: { ttl: 24 * 60 * 60, urgency: 'normal' } }, sub, keys);
            const res = await fetch(sub.endpoint, payload);
            if (res.status === 404 || res.status === 410) {
                await sql`delete from push_subscriptions where id = ${s.id}`;
            } else if (res.ok) {
                ok++;
                await sql`update push_subscriptions set last_ok_at = now() where id = ${s.id}`;
            } else {
                lastError = `push ${res.status}`;
            }
        } catch (e) {
            lastError = (e as Error).message;
        }
    }
    if (ok > 0) return 'sent';
    return lastError || 'skipped';
}
