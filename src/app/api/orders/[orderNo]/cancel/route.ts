import { jsonError, sameOrigin, sessionUserId } from '../../../../../lib/api';
import { getOrderByNo } from '../../../../../lib/orders';
import { customerCanCancel } from '../../../../../lib/order-status';
import { cancelPaidOrder } from '../../../../../lib/payments';

export const runtime = 'edge';

type Ctx = { params: Promise<{ orderNo: string }> };

/** Customer-initiated full cancellation, only before the parcel is handed to the carrier. */
export async function POST(request: Request, ctx: Ctx) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);
    const { orderNo } = await ctx.params;

    const order = await getOrderByNo(orderNo, userId);
    if (!order) return jsonError('Not Found', 404);
    if (!customerCanCancel(order.status)) {
        return jsonError('이미 상품 준비가 시작되어 직접 취소할 수 없어요. 고객센터(031-998-7234)로 문의해 주세요.', 409);
    }

    const result = await cancelPaidOrder(order, '고객 요청 취소');
    if (!result.ok) return jsonError(result.message, 502);
    return Response.json({ order: result.order });
}
