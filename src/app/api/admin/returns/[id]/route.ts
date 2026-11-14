import { getSql } from '../../../../../lib/db';
import { isUuid, jsonError, requireAdmin, sameOrigin } from '../../../../../lib/api';
import { getOrderByNo } from '../../../../../lib/orders';
import { cancelPayment } from '../../../../../lib/toss';
import { enqueue } from '../../../../../lib/notify';
import { RETURN_TYPE_LABEL, getReturn, refundedSoFar } from '../../../../../lib/returns';

export const runtime = 'edge';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    if (!(await requireAdmin())) return jsonError('Forbidden', 403);
    const { id } = await ctx.params;
    if (!isUuid(id)) return jsonError('Not Found', 404);

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    const r = await getReturn(id);
    if (!r) return jsonError('Not Found', 404);
    const sql = getSql();
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : '';
    const typeLabel = RETURN_TYPE_LABEL[r.type].split(' ')[0];
    const base = { orderNo: r.orderNo, typeLabel };

    switch (body.action) {
        case 'approve': {
            if (r.status !== 'requested') return jsonError('접수 상태에서만 승인할 수 있어요', 409);
            await sql`update return_requests set status = 'approved', admin_note = ${note || null}, updated_at = now() where id = ${id}`;
            await enqueue('return_approved', { ...base, note }, { userId: r.userId });
            break;
        }
        case 'reject': {
            if (r.status !== 'requested' && r.status !== 'approved') return jsonError('이미 끝난 신청이에요', 409);
            const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : '';
            if (reason.length < 2) return jsonError('반려 사유를 적어 주세요 (고객에게 안내돼요)');
            await sql`update return_requests set status = 'rejected', reject_reason = ${reason}, updated_at = now() where id = ${id}`;
            await enqueue('return_rejected', { ...base, reason }, { userId: r.userId });
            break;
        }
        case 'complete': {
            if (r.status !== 'approved') return jsonError('회수 진행 중인 신청만 완료 처리할 수 있어요', 409);
            const order = await getOrderByNo(r.orderNo);
            if (!order) return jsonError('주문을 찾을 수 없어요', 404);
            let refund = 0;
            if (r.type === 'refund') {
                refund = Math.floor(Number(body.refundAmount));
                const left = order.amount - (await refundedSoFar(order.id));
                if (!(refund >= 0 && refund <= left)) return jsonError(`환불 금액은 0~${left.toLocaleString('ko-KR')}원 사이로 입력해 주세요`);
                if (refund > 0) {
                    if (!order.paymentKey || !order.keyType) return jsonError('결제 정보가 없는 주문이에요', 409);
                    const res = await cancelPayment(order.keyType, order.paymentKey, '반품 환불', refund, `return-${id}`);
                    if (!res.ok) return jsonError(`환불하지 못했어요: ${res.message}`, 502);
                }
                if (refund > 0 && refund === left) {
                    await sql`update orders set status = 'canceled', canceled_at = now(), cancel_reason = '반품 환불', updated_at = now() where id = ${order.id}`;
                }
            }
            await sql`update return_requests set status = 'completed', refund_amount = ${r.type === 'refund' ? refund : null},
                      admin_note = coalesce(${note || null}, admin_note), completed_at = now(), updated_at = now() where id = ${id}`;
            await enqueue('return_completed', { ...base, refund, note }, { userId: r.userId });
            break;
        }
        default:
            return jsonError('알 수 없는 요청이에요');
    }
    return Response.json({ request: await getReturn(id) });
}
