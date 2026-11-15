import { endAllSessions } from '../../../../lib/handoff';
import { jsonError, sameOrigin, sessionUserId } from '../../../../lib/api';

export const runtime = 'edge';

/** "모든 기기에서 로그아웃": every login of this member (this device included) ends. */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('로그인이 필요해요', 401);
    await endAllSessions(userId);
    return Response.json({ ok: true });
}
