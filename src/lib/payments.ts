import { getSql } from './db';
import { cancelPayment, confirmPayment, paymentLabel } from './toss';
import { clearCartMode, getOrderByNo, type Order } from './orders';
import { enqueue } from './notify';
import { markCouponUsed, restoreCouponForOrder } from './coupons';

type Result = { ok: true; order: Order } | { ok: false; message: string; order?: Order | null };

/**
 * Called from the Toss success redirect. Verifies the amount against our own order row
 * (never trust the URL), confirms with Toss, then marks the order paid. Idempotent.
 */
export async function finalizeWidgetPayment(
    userId: string,
    params: { paymentKey: string; orderId: string; amount: number },
): Promise<Result> {
    const order = await getOrderByNo(params.orderId, userId);
    if (!order) return { ok: false, message: '주문을 찾을 수 없어요' };
    if (order.status !== 'pending') {
        // Refreshing the success page must not charge or fail anything twice.
        return order.status === 'paid' || order.status === 'preparing' || order.status === 'shipped' || order.status === 'delivered'
            ? { ok: true, order }
            : { ok: false, message: order.failReason ?? '이미 처리된 주문이에요', order };
    }
    if (order.kind !== 'once') return { ok: false, message: '잘못된 결제 요청이에요', order };
    if (order.amount !== params.amount) {
        await markFailed(order.id, '결제 금액이 주문 금액과 달라요');
        return { ok: false, message: '결제 금액이 주문 금액과 달라 결제를 진행하지 않았어요', order };
    }

    const res = await confirmPayment(params.paymentKey, order.orderNo, order.amount);
    if (!res.ok) {
        await markFailed(order.id, `${res.code}: ${res.message}`);
        return { ok: false, message: res.message, order };
    }

    const sql = getSql();
    const updated = await sql`
        update orders set status = 'paid', payment_key = ${res.data.paymentKey}, key_type = 'widget',
            payment_label = ${paymentLabel(res.data)}, paid_at = now(), updated_at = now()
        where id = ${order.id} and status = 'pending'
        returning id
    `;
    if (updated.length > 0) {
        await markCouponUsed(order.id);
        await clearCartMode(userId, 'once');
        await enqueue('order_paid', { orderNo: order.orderNo, amount: order.amount, items: order.items }, { userId });
    }
    const fresh = await getOrderByNo(order.orderNo, userId);
    return { ok: true, order: fresh ?? order };
}

async function markFailed(orderId: string, reason: string) {
    await getSql()`
        update orders set status = 'failed', fail_reason = ${reason.slice(0, 300)}, updated_at = now()
        where id = ${orderId} and status = 'pending'
    `;
}

export async function failPendingOrder(userId: string, orderNo: string, reason: string) {
    const order = await getOrderByNo(orderNo, userId);
    if (order && order.status === 'pending') await markFailed(order.id, reason);
}

/** Cancel (full refund) a paid order via Toss and record it. Used by customers and the admin. */
export async function cancelPaidOrder(order: Order, reason: string): Promise<Result> {
    if (order.status === 'canceled') return { ok: true, order };
    if (!order.paymentKey || !order.keyType) return { ok: false, message: '결제 정보가 없는 주문이에요', order };

    const res = await cancelPayment(order.keyType, order.paymentKey, reason);
    // Toss answers ALREADY_CANCELED_PAYMENT if we retry after a partial failure: treat as done.
    if (!res.ok && res.code !== 'ALREADY_CANCELED_PAYMENT') return { ok: false, message: res.message, order };

    const sql = getSql();
    const changed = await sql`
        update orders set status = 'canceled', canceled_at = now(), cancel_reason = ${reason.slice(0, 200)}, updated_at = now()
        where id = ${order.id} and status <> 'canceled' returning id
    `;
    if (changed.length > 0) {
        // The coupon goes back to the customer, and a refunded gift means the bottle was never sent.
        await restoreCouponForOrder(order.id);
        if (order.userId && order.items.some((i) => i.gift)) {
            await sql`update users set shaker_gifted_at = null where id = ${order.userId}`;
        }
        // A refunded subscription charge no longer counts toward the minimum period; with no paid cycle left
        // the subscription itself ends.
        if (order.kind === 'subscription' && order.subscriptionId) {
            await sql`
                update subscriptions set
                    paid_count = greatest(paid_count - 1, 0),
                    status = case when paid_count - 1 <= 0 then 'canceled' else status end,
                    canceled_at = case when paid_count - 1 <= 0 then now() else canceled_at end,
                    cancel_reason = case when paid_count - 1 <= 0 then '첫 회차 주문 취소' else cancel_reason end,
                    updated_at = now()
                where id = ${order.subscriptionId} and status <> 'canceled'
            `;
        }
    }
    await enqueue('order_canceled', { orderNo: order.orderNo, amount: order.amount, reason }, { userId: order.userId });
    const fresh = await getOrderByNo(order.orderNo);
    return { ok: true, order: fresh ?? order };
}
