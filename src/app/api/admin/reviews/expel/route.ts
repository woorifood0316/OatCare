import { isUuid, jsonError, requireAdmin, sameOrigin } from '../../../../../lib/api';
import { adminExpelMember } from '../../../../../lib/reviews';

export const runtime = 'edge';

/** Operator: expel a member who reached the review-violation limit. */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const admin = await requireAdmin();
    if (!admin) return jsonError('Forbidden', 403);
    let body: { userId?: unknown };
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    if (!isUuid(body.userId)) return jsonError('회원을 찾을 수 없어요', 404);
    if (body.userId === admin.id) return jsonError('본인 계정은 제명할 수 없어요');
    const result = await adminExpelMember(body.userId);
    if (!result.ok) return jsonError(result.message ?? '제명하지 못했어요', 409);
    return Response.json({ ok: true });
}
