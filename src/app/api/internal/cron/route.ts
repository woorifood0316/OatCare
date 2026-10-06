import { runBilling, runNotifications, runReminders } from '../../../../lib/cron';

export const runtime = 'edge';

function authorized(request: Request): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const given = request.headers.get('authorization') ?? '';
    const expected = `Bearer ${secret}`;
    if (given.length !== expected.length) return false;
    // constant-time compare
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
}

/**
 * Called by the scheduler Worker (see workers/billing-cron).
 *   ?job=billing  -> charge due subscriptions + send 2-day reminders (daily)
 *   ?job=notify   -> deliver queued notifications (every few minutes)
 *   (no job)      -> everything
 */
export async function POST(request: Request) {
    if (!authorized(request)) return new Response('Unauthorized', { status: 401 });

    const job = new URL(request.url).searchParams.get('job');
    const out: Record<string, unknown> = {};
    if (!job || job === 'billing') {
        out.billing = await runBilling();
        out.reminders = await runReminders();
    }
    if (!job || job === 'notify' || job === 'billing') {
        out.notifications = await runNotifications();
    }
    return Response.json(out);
}
