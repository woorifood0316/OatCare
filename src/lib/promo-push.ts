// Event / benefit app notifications written by the shop (관리자 > 이벤트 알림). Server only.
// 정보통신망법 rules applied here and again when sending:
//  - only members with the event/benefit consent (users.marketing_agreed) AND app notifications on a device
//  - the title starts with "(광고)" and the text ends with how to stop them
//  - none between 21:00 and 08:00 (KST): a message written then waits until 08:00
// The messages ride the normal notification queue (channel 'push', event 'promo_push'), so no table of their own.
import { getSql } from './db';

export const PROMO_TITLE_MAX = 40;
export const PROMO_BODY_MAX = 120;
export const PROMO_OPT_OUT = '수신 거부: 마이페이지 › 내 정보 › 이벤트·혜택 알림';

/** Members who may receive one now (consent + at least one device). */
export async function promoAudience(): Promise<number> {
    const r = await getSql()`
        select count(distinct ps.user_id)::int n
        from push_subscriptions ps join users u on u.id = ps.user_id
        where u.marketing_agreed
    `;
    return (r[0]?.n as number) ?? 0;
}

/** KST hour now. */
function kstHour(d = new Date()): number {
    return new Date(d.getTime() + 9 * 3600 * 1000).getUTCHours();
}

/** Ads are not sent at night (21:00-08:00 KST). */
export function isNight(d = new Date()): boolean {
    const h = kstHour(d);
    return h >= 21 || h < 8;
}

/** Now, or the next 08:00 KST when it is night. */
function sendTime(now = new Date()): Date {
    if (!isNight(now)) return now;
    const k = new Date(now.getTime() + 9 * 3600 * 1000); // KST clock as UTC fields
    const day = kstHour(now) >= 21 ? k.getUTCDate() + 1 : k.getUTCDate();
    // 08:00 KST = 23:00 UTC of the day before
    return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), day, 8 - 9, 0, 0));
}

export async function createPromo(input: { title: string; body: string; url: string }): Promise<{ id: string; recipients: number; sendAfter: string }> {
    const id = crypto.randomUUID();
    const sendAfter = sendTime().toISOString();
    const payload = JSON.stringify({ campaignId: id, title: input.title, body: input.body, url: input.url, sendAfter });
    const rows = await getSql()`
        insert into notifications (user_id, channel, event, payload)
        select distinct ps.user_id, 'push', 'promo_push', ${payload}::jsonb
        from push_subscriptions ps join users u on u.id = ps.user_id
        where u.marketing_agreed
        returning id
    `;
    return { id, recipients: rows.length, sendAfter };
}

export interface PromoRow {
    id: string;
    createdAt: string;
    title: string;
    body: string;
    sendAfter: string;
    total: number;
    sent: number;
    waiting: number;
    skipped: number;
    failed: number;
}

export async function listPromos(limit = 30): Promise<PromoRow[]> {
    const rows = await getSql()`
        select payload->>'campaignId' id, min(created_at) created_at, payload->>'title' title, payload->>'body' body, payload->>'sendAfter' send_after,
               count(*)::int total,
               count(*) filter (where status = 'sent')::int sent,
               count(*) filter (where status = 'pending')::int waiting,
               count(*) filter (where status = 'skipped')::int skipped,
               count(*) filter (where status = 'failed')::int failed
        from notifications where event = 'promo_push'
        group by 1, 3, 4, 5 order by 2 desc limit ${limit}
    `;
    return rows.map((r) => ({
        id: r.id as string,
        createdAt: new Date(r.created_at as string).toISOString(),
        title: r.title as string,
        body: r.body as string,
        sendAfter: r.send_after as string,
        total: r.total as number,
        sent: r.sent as number,
        waiting: r.waiting as number,
        skipped: r.skipped as number,
        failed: r.failed as number,
    }));
}
