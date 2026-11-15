import { getSql } from './db';
import { addDays, todayKst } from './dates';
import { dueSubscriptionIds, mapSubscription, processDueSubscription } from './subscriptions';
import { priceCart } from './catalog';
import { enqueue, type NotifyEvent } from './notify';
import { adminMessage } from './notify-messages';
import { pushMessage, sendPushTo } from './push';
import { PROMO_OPT_OUT, isNight } from './promo-push';
import { buildCustomerEmail } from './email-template';

/** Charge every subscription whose billing day has come (bounded per run to fit edge time limits). */
export async function runBilling(limit = 20) {
    const ids = await dueSubscriptionIds(limit);
    const results: { id: string; outcome: string; detail?: string }[] = [];
    for (const id of ids) {
        try {
            results.push(await processDueSubscription(id));
        } catch (e) {
            results.push({ id, outcome: 'error', detail: (e as Error).message?.slice(0, 120) });
        }
    }
    return { processed: results.length, results };
}

/** Tell customers two days before the card is charged (once per billing date). */
export async function runReminders() {
    const sql = getSql();
    const target = addDays(todayKst(), 2);
    const rows = await sql`
        select * from subscriptions
        where status = 'active' and skip_next = false and next_billing_date = ${target}
          and (reminded_for is null or reminded_for <> next_billing_date)
        limit 200
    `;
    for (const r of rows) {
        const sub = mapSubscription(r);
        const priced = priceCart(sub.lines, 'subscribe');
        await enqueue('billing_upcoming', { subscriptionId: sub.id, date: target, amount: priced.total }, { userId: sub.userId, admin: false });
        await sql`update subscriptions set reminded_for = ${target} where id = ${sub.id}`;
    }
    return { reminded: rows.length };
}

async function postJson(url: string, body: unknown): Promise<string | null> {
    try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        return res.ok ? null : `HTTP ${res.status}`;
    } catch (e) {
        return (e as Error).message;
    }
}

/** Operator channel: a generic chat webhook (Slack/Discord compatible) and/or a Telegram bot. */
async function sendAdmin(text: string): Promise<'sent' | 'skipped' | string> {
    const webhook = process.env.ADMIN_WEBHOOK_URL;
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChat = process.env.TELEGRAM_CHAT_ID;
    if (!webhook && !(tgToken && tgChat)) return 'skipped';

    const errors: string[] = [];
    if (webhook) {
        const e = await postJson(webhook, { text, content: text });
        if (e) errors.push(`webhook ${e}`);
    }
    if (tgToken && tgChat) {
        const e = await postJson(`https://api.telegram.org/bot${tgToken}/sendMessage`, { chat_id: tgChat, text });
        if (e) errors.push(`telegram ${e}`);
    }
    return errors.length ? errors.join('; ') : 'sent';
}

/** "참오트케어 <no-reply@chamoatcare.com>" or a bare address -> Brevo's sender object. */
export function parseSender(from: string): { name?: string; email: string } | null {
    const m = from.match(/^\s*(.*?)\s*<\s*([^>\s]+@[^>\s]+)\s*>\s*$/);
    if (m) return m[1] ? { name: m[1].replace(/^"|"$/g, ''), email: m[2] } : { email: m[2] };
    const bare = from.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bare) ? { email: bare } : null;
}

/**
 * Customer email through Brevo's transactional API (https://www.brevo.com, free plan: 300 emails a day).
 * Needs BREVO_API_KEY and EMAIL_FROM (a sender verified in Brevo). Skipped until configured.
 */
export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<'sent' | 'skipped' | string> {
    const key = process.env.BREVO_API_KEY;
    const sender = parseSender(process.env.EMAIL_FROM ?? '');
    if (!key || !sender) return 'skipped';
    try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'api-key': key, accept: 'application/json', 'content-type': 'application/json' },
            body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: text, ...(html ? { htmlContent: html } : {}) }),
        });
        if (res.ok) return 'sent';
        const body = await res.text().catch(() => '');
        return `HTTP ${res.status} ${body.slice(0, 200)}`;
    } catch (e) {
        return (e as Error).message;
    }
}

/** Deliver queued notifications. Rows that can't be delivered (no config / no email) are 'skipped', not retried forever. */
export async function runNotifications(limit = 50) {
    const sql = getSql();
    const rows = await sql`
        select n.id, n.channel, n.event, n.payload, n.attempts, n.user_id, u.email, u.marketing_agreed
        from notifications n left join users u on u.id = n.user_id
        where n.status = 'pending' and n.attempts < 5
          and (n.payload->>'sendAfter' is null or (n.payload->>'sendAfter')::timestamptz <= now())
        order by n.created_at asc limit ${limit}
    `;
    const tally = { sent: 0, skipped: 0, failed: 0 };
    for (const r of rows) {
        const event = r.event as NotifyEvent;
        const payload = (r.payload ?? {}) as Record<string, unknown>;
        let outcome: string;

        if (r.channel === 'admin') {
            outcome = await sendAdmin(adminMessage(event, payload));
        } else if (r.channel === 'push' && event === 'promo_push') {
            // ads: the consent is checked again at sending time, and nothing goes out at night (waits for the morning)
            if (isNight()) continue;
            outcome = r.user_id && r.marketing_agreed
                ? await sendPushTo(r.user_id as string, {
                      title: `(광고) ${payload.title as string}`,
                      body: `${payload.body as string}
${PROMO_OPT_OUT}`,
                      url: (payload.url as string) || '/',
                      tag: `promo-${payload.campaignId as string}`,
                  })
                : 'skipped';
        } else if (r.channel === 'push') {
            const msg = r.user_id ? pushMessage(event, payload) : null;
            outcome = msg ? await sendPushTo(r.user_id as string, msg) : 'skipped';
        } else {
            const to = r.email as string | null;
            const msg = to && !to.endsWith('.invalid') ? await buildCustomerEmail(event, payload) : null;
            outcome = !msg || !to ? 'skipped' : await sendEmail(to, msg.subject, msg.text, msg.html);
        }

        if (outcome === 'sent') {
            await sql`update notifications set status = 'sent', sent_at = now(), attempts = attempts + 1 where id = ${r.id}`;
            tally.sent++;
        } else if (outcome === 'skipped') {
            await sql`update notifications set status = 'skipped', attempts = attempts + 1 where id = ${r.id}`;
            tally.skipped++;
        } else {
            await sql`update notifications set attempts = attempts + 1, error = ${outcome.slice(0, 200)},
                      status = case when attempts + 1 >= 5 then 'failed' else 'pending' end where id = ${r.id}`;
            tally.failed++;
        }
    }
    return { picked: rows.length, ...tally };
}
