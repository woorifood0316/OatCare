import { getSql } from '../../../../../lib/db';
import { jsonError, requireAdmin, sameOrigin } from '../../../../../lib/api';
import { getOrderByNo } from '../../../../../lib/orders';
import { CARRIERS, NEXT_STATUSES } from '../../../../../lib/order-status';
import { cancelPaidOrder } from '../../../../../lib/payments';
import { enqueue } from '../../../../../lib/notify';

export const runtime = 'edge';

type Ctx = { params: Promise<{ orderNo: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    if (!(await requireAdmin())) return jsonError('Forbidden', 403);
    const { orderNo } = await ctx.params;

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    const order = await getOrderByNo(orderNo);
    if (!order) return jsonError('Not Found', 404);
    const sql = getSql();

    switch (body.action) {
        case 'set_status': {
            const next = String(body.status);
            if (!NEXT_STATUSES[order.status].includes(next as never) || next === 'shipped') {
                return jsonError('이 상태에서는 변경할 수 없어요 (발송은 운송장 입력으로 처리해요)', 409);
            }
            await sql`update orders set status = ${next}, updated_at = now(),
                      delivered_at = case when ${next} = 'delivered' then now() else delivered_at end where id = ${order.id}`;
            break;
        }
        case 'ship': {
            const carrier = CARRIERS.find((c) => c.name === body.carrier || c.id === body.carrier);
            const trackingNo = typeof body.trackingNo === 'string' ? body.trackingNo.replace(/[^0-9A-Za-z-]/g, '').slice(0, 30) : '';
            if (!carrier) return jsonError('택배사를 선택해 주세요');
            if (trackingNo.length < 5) return jsonError('운송장 번호를 정확히 입력해 주세요');
            if (!NEXT_STATUSES[order.status].includes('shipped') && order.status !== 'shipped') {
                return jsonError('결제 완료된 주문만 발송 처리할 수 있어요', 409);
            }
            const wasShipped = order.status === 'shipped';
            await sql`update orders set status = 'shipped', carrier = ${carrier.name}, tracking_no = ${trackingNo},
                      shipped_at = coalesce(shipped_at, now()), updated_at = now() where id = ${order.id}`;
            if (!wasShipped) {
                await enqueue('order_shipped', { orderNo, carrier: carrier.name, trackingNo }, { userId: order.userId });
            }
            break;
        }
        case 'cancel': {
            const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 200) : '관리자 취소';
            if (order.status === 'canceled') return jsonError('이미 취소된 주문이에요', 409);
            if (order.status === 'pending' || order.status === 'failed') return jsonError('결제되지 않은 주문이에요', 409);
            const result = await cancelPaidOrder(order, reason);
            if (!result.ok) return jsonError(result.message, 502);
            break;
        }
        default:
            return jsonError('알 수 없는 요청이에요');
    }
    return Response.json({ order: await getOrderByNo(orderNo) });
}
