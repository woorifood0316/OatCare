// The job that settles payments whose result was unclear (결제 확인 중), every few minutes. Server only.
import { getSql } from './db';
import { mapOrder } from './orders';
import { enqueue } from './notify';
import { lookupPayment } from './payment-check';
import { settleCheckingWidgetOrder } from './payments';
import { completeSubscriptionOrder, failSubscriptionOrder, getSubscription, markCharged } from './subscriptions';

/**
 * Orders 결제 확인 중, and subscription tries left 결제 대기 by an interrupted run (not touched for 10 minutes).
 * Each is looked up at the payment company: approved -> completed once (coupon used, round counted, notice sent);
 * not approved -> failed (coupon free again; a first charge that never went through ends its subscription);
 * still unclear -> looked at again next time.
 */
export async function settleUnclearPayments(limit = 20) {
    const sql = getSql();
    const rows = await sql`
        select * from orders
        where (status = 'checking' and updated_at < now() - interval '1 minute')
           or (status = 'pending' and kind = 'subscription' and charge_no is not null and updated_at < now() - interval '10 minutes')
        order by updated_at asc limit ${limit}
    `;
    const out: { orderNo: string; result: string }[] = [];
    for (const r of rows) {
        const order = mapOrder(r);
        try {
            if (order.kind === 'once') {
                out.push({ orderNo: order.orderNo, result: await settleCheckingWidgetOrder(order) });
                continue;
            }
            const round = (r.charge_no as number | null) ?? null;
            const sub = order.subscriptionId ? await getSubscription(order.subscriptionId) : null;
            const seen = await lookupPayment({ keySet: 'api', orderNo: order.orderNo, amount: order.amount, since: new Date(order.createdAt) });
            if (seen.state === 'paid') {
                const done = await completeSubscriptionOrder(order.id, seen.payment);
                if (done && sub && round !== null && sub.paidCount === round - 1) {
                    const counted = await markCharged(sub);
                    if (counted.counted) {
                        if (round === 1) {
                            await enqueue('subscription_started', { subscriptionId: sub.id, orderNo: order.orderNo, amount: order.amount, cycleDays: sub.cycleDays }, { userId: sub.userId });
                        } else {
                            await enqueue('subscription_charged', { subscriptionId: sub.id, orderNo: order.orderNo, amount: order.amount }, { userId: sub.userId });
                        }
                    }
                }
                out.push({ orderNo: order.orderNo, result: 'paid' });
            } else if (seen.state === 'failed') {
                const failed = await failSubscriptionOrder(order.id, seen.reason, order.subscriptionId, 'NOT_CHARGED');
                // the first charge never went through: the subscription it was opening ends (nothing was taken)
                if (failed && sub && round === 1 && sub.paidCount === 0 && sub.status === 'active') {
                    const ended = await sql`update subscriptions set status = 'canceled', canceled_at = now(), cancel_reason = '첫 결제 실패', updated_at = now()
                                            where id = ${sub.id} and paid_count = 0 and status = 'active' returning id`;
                    if (ended.length > 0) {
                        await enqueue('subscription_canceled', { subscriptionId: sub.id, reason: '첫 결제가 승인되지 않았어요 (청구된 금액 없음)' }, { userId: sub.userId });
                    }
                }
                out.push({ orderNo: order.orderNo, result: 'failed' });
            } else {
                await sql`update orders set status = 'checking', fail_reason = ${seen.reason}, updated_at = now() where id = ${order.id} and status in ('pending', 'checking')`;
                out.push({ orderNo: order.orderNo, result: 'checking' });
            }
        } catch (e) {
            out.push({ orderNo: order.orderNo, result: `error ${(e as Error).message?.slice(0, 80)}` });
        }
    }
    return { processed: out.length, results: out };
}
