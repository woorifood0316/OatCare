import { createHandoff } from '../../../../lib/handoff';
import { jsonError, sameOrigin, sessionUserId } from '../../../../lib/api';

export const runtime = 'edge';

/** One-time login for moving from an app's built-in browser to Chrome / Safari (3 minutes, works once). */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return Response.json({ token: null });
    return Response.json({ token: await createHandoff(userId) });
}
