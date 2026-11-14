import { getSql } from '../../../../lib/db';
import { isUuid, jsonError, sameOrigin, sessionUserId } from '../../../../lib/api';
import { getReturn } from '../../../../lib/returns';

export const runtime = 'edge';

type Ctx = { params: Promise<{ id: string }> };

/** The customer withdraws a request the shop has not acted on yet. */
export async function PATCH(request: Request, ctx: Ctx) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('로그인이 필요해요', 401);
    const { id } = await ctx.params;
    if (!isUuid(id)) return jsonError('Not Found', 404);
    const r = await getReturn(id, userId);
    if (!r) return jsonError('Not Found', 404);
    if (r.status !== 'requested') return jsonError('이미 처리가 시작되어 취소할 수 없어요. 고객센터로 문의해 주세요.', 409);
    await getSql()`update return_requests set status = 'withdrawn', updated_at = now() where id = ${id} and status = 'requested'`;
    return Response.json({ ok: true });
}
