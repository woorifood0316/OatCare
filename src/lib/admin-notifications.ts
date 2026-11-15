// Admin: find past notifications with filters, send chosen ones again, and send test emails.
import { getSql } from './db';
import { runNotifications, sendEmail } from './cron';
import { buildCustomerEmail } from './email-template';
import { getOrderByNo, type Order } from './orders';
import type { NotifyEvent } from './notify';

export const EVENT_LABEL: Record<string, string> = {
    promo_push: '이벤트 알림 (광고)',
    order_paid: '주문 완료',
    order_canceled: '주문 취소',
    order_shipped: '발송 안내',
    subscription_started: '구독 시작',
    subscription_charged: '정기결제 완료',
    subscription_charge_failed: '정기결제 실패',
    subscription_paused: '구독 일시정지',
    subscription_cancel_requested: '구독 해지 예약',
    subscription_canceled: '구독 해지',
    billing_upcoming: '결제 예정 안내',
    return_requested: '교환·반품 신청',
    return_approved: '교환·반품 승인',
    return_rejected: '교환·반품 반려',
    return_completed: '교환·반품 완료',
    inquiry_pending: '문의 답변 필요',
    inquiry_answered: '문의 답변',
    marketing_consent: '알림 수신 동의·철회',
};

export interface NotificationFilter {
    channel?: string;
    status?: string;
    event?: string;
    q?: string;
    from?: string;
    to?: string;
}

export interface NotificationItem {
    id: string;
    channel: string;
    event: string;
    status: string;
    error: string | null;
    createdAt: string;
    sentAt: string | null;
    userName: string | null;
    email: string | null;
}

/** Notifications matching the filters, newest first (max 300). */
export async function searchNotifications(f: NotificationFilter): Promise<NotificationItem[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (cond: string, v: unknown) => {
        params.push(v);
        where.push(cond.replace('$?', `$${params.length}`));
    };
    if (f.channel === 'email' || f.channel === 'admin') add('n.channel = $?', f.channel);
    if (f.status && ['pending', 'sent', 'skipped', 'failed'].includes(f.status)) add('n.status = $?', f.status);
    if (f.event && f.event in EVENT_LABEL) add('n.event = $?', f.event);
    if (f.q && f.q.trim()) {
        params.push(`%${f.q.trim()}%`);
        where.push(`(u.name ilike $${params.length} or u.email ilike $${params.length})`);
    }
    if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) add("n.created_at >= ($?::date - interval '9 hours')", f.from);
    if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) add("n.created_at < ($?::date + interval '1 day' - interval '9 hours')", f.to);
    const sql = getSql();
    const rows = (await sql.query(
        `select n.*, u.name as user_name, u.email from notifications n left join users u on u.id = n.user_id
         ${where.length ? `where ${where.join(' and ')}` : ''} order by n.created_at desc limit 300`,
        params,
    )) as Record<string, unknown>[];
    return rows.map((r) => ({
        id: r.id as string,
        channel: r.channel as string,
        event: r.event as string,
        status: r.status as string,
        error: (r.error as string | null) ?? null,
        createdAt: new Date(r.created_at as string).toISOString(),
        sentAt: r.sent_at ? new Date(r.sent_at as string).toISOString() : null,
        userName: (r.user_name as string | null) ?? null,
        email: (r.email as string | null) ?? null,
    }));
}

/**
 * Queue the chosen notifications again (as new rows, so the history stays) and deliver them right away.
 * Order emails are rebuilt from the order as it is now.
 */
export async function resendNotifications(ids: string[]) {
    const sql = getSql();
    const copied = await sql`
        insert into notifications (user_id, channel, event, payload)
        select user_id, channel, event, payload from notifications where id = any(${ids})
        returning id
    `;
    const delivery = await runNotifications(Math.max(50, copied.length + 10));
    return { queued: copied.length, ...delivery };
}

/** One test email of each kind to `to`, built from the most recent real order (or nothing for order mails). */
export async function sendTestEmails(to: string, kinds: NotifyEvent[]) {
    const sql = getSql();
    const recent = await sql`select order_no from orders where status in ('paid','preparing','shipped','delivered') order by created_at desc limit 1`;
    const order: Order | null = recent[0] ? await getOrderByNo(recent[0].order_no as string) : null;
    const sample: Record<string, Record<string, unknown>> = {
        order_paid: { orderNo: order?.orderNo, amount: order?.amount },
        order_shipped: { orderNo: order?.orderNo, carrier: order?.carrier ?? 'CJ대한통운', trackingNo: order?.trackingNo ?? '000000000000' },
        order_canceled: { orderNo: order?.orderNo, amount: order?.amount, reason: '(테스트) 고객 요청 취소' },
        subscription_charged: { orderNo: order?.orderNo, amount: order?.amount },
        billing_upcoming: { date: '2026-12-01', amount: order?.amount ?? 17700 },
        return_approved: { orderNo: order?.orderNo, typeLabel: '반품', note: '(테스트) 11/20 회수 예정' },
        marketing_consent: { agreed: true, date: '2026년 11월 15일', via: 'test' },
        inquiry_answered: { question: '(테스트) 이 상품 당은 얼마나 되나요?', answer: '그레인 한 포(50g)의 당류는 7g(1일 기준치의 7%)예요.' },
    };
    const results: { kind: string; outcome: string }[] = [];
    for (const kind of kinds) {
        const needsOrder = kind.startsWith('order_') || kind === 'subscription_charged' || kind === 'return_approved';
        if (needsOrder && !order) {
            results.push({ kind, outcome: '주문이 없어 건너뜀' });
            continue;
        }
        const mail = await buildCustomerEmail(kind, sample[kind] ?? {}, needsOrder ? order : null);
        if (!mail) {
            results.push({ kind, outcome: '메일 없음' });
            continue;
        }
        results.push({ kind, outcome: await sendEmail(to, `[테스트] ${mail.subject}`, mail.text, mail.html) });
    }
    return { orderNo: order?.orderNo ?? null, results };
}

export const TEST_KINDS: NotifyEvent[] = ['order_paid', 'order_shipped', 'subscription_charged', 'billing_upcoming', 'return_approved', 'marketing_consent'];
