import { endAllSessions } from '../../../../../../lib/handoff';
import { isUuid, jsonError, requireAdmin, sameOrigin } from '../../../../../../lib/api';

export const runtime = 'edge';

/** The shop ends every login of a member (lost phone, the member called in). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    if (!(await requireAdmin())) return jsonError('Forbidden', 403);
    const { id } = await params;
    if (!isUuid(id)) return jsonError('Bad Request', 400);
    await endAllSessions(id);
    return Response.json({ ok: true });
}
