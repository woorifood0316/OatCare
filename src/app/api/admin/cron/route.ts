import { jsonError, requireAdmin, sameOrigin } from '../../../../lib/api';
import { runBilling, runNotifications, runReminders } from '../../../../lib/cron';

export const runtime = 'edge';

/** Run a scheduler job by hand from the admin screen (same code the cron Worker triggers). */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    if (!(await requireAdmin())) return jsonError('Forbidden', 403);

    let body: { job?: unknown };
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    if (body.job === 'billing') return Response.json({ billing: await runBilling(), reminders: await runReminders() });
    if (body.job === 'notify') return Response.json({ notifications: await runNotifications() });
    return jsonError('알 수 없는 작업이에요');
}
