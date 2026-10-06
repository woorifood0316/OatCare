import { getSql } from './db';

export type NotifyEvent =
    | 'order_paid'
    | 'order_canceled'
    | 'order_shipped'
    | 'subscription_started'
    | 'subscription_charged'
    | 'subscription_charge_failed'
    | 'subscription_paused'
    | 'subscription_canceled'
    | 'billing_upcoming';

/**
 * Queue a notification. Senders (email / operator webhook, later KakaoTalk) pick rows up from here,
 * so adding a channel never touches the places that raise events. Never throws: a notification
 * problem must not break a payment.
 */
export async function enqueue(
    event: NotifyEvent,
    payload: Record<string, unknown>,
    opts: { userId?: string | null; customer?: boolean; admin?: boolean } = {},
): Promise<void> {
    try {
        const sql = getSql();
        const json = JSON.stringify(payload);
        const userId = opts.userId ?? null;
        if (opts.customer !== false && userId) {
            await sql`insert into notifications (user_id, channel, event, payload) values (${userId}, 'email', ${event}, ${json}::jsonb)`;
        }
        if (opts.admin !== false) {
            await sql`insert into notifications (user_id, channel, event, payload) values (${userId}, 'admin', ${event}, ${json}::jsonb)`;
        }
    } catch (e) {
        console.error('[notify] enqueue failed', e);
    }
}
