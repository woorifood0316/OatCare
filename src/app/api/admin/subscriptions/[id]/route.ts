import { getSql } from '../../../../../lib/db';
import { addDays, isUuid, jsonError, requireAdmin, sameOrigin, todayKst } from '../../../../../lib/api';
import { chargeSubscription, getSubscription, markCharged } from '../../../../../lib/subscriptions';
import { enqueue } from '../../../../../lib/notify';

export const runtime = 'edge';

type Ctx = { params: Promise<{ id: string }> };

/** Operator actions on any customer's subscription. */
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
    const sub = await getSubscription(id);
    if (!sub) return jsonError('Not Found', 404);
    if (sub.status === 'canceled') return jsonError('이미 해지된 구독이에요', 409);
    const sql = getSql();

    switch (body.action) {
        case 'pause':
            await sql`update subscriptions set status = 'paused', updated_at = now() where id = ${id}`;
            break;
        case 'resume': {
            const tomorrow = todayKst(1);
            await sql`update subscriptions set status = 'active', fail_count = 0,
                      next_billing_date = ${sub.nextBillingDate > tomorrow ? sub.nextBillingDate : tomorrow}, updated_at = now() where id = ${id}`;
            break;
        }
        case 'cancel': {
            // The operator can end a subscription at once (e.g. for a refund), regardless of the minimum period.
            const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 200) : '관리자 해지';
            await sql`update subscriptions set status = 'canceled', canceled_at = now(), cancel_reason = ${reason}, updated_at = now() where id = ${id}`;
            await enqueue('subscription_canceled', { subscriptionId: id, reason }, { userId: sub.userId });
            break;
        }
        case 'set_next_date': {
            const date = String(body.date ?? '');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayKst() || date > addDays(todayKst(), 120)) {
                return jsonError('오늘부터 120일 이내의 날짜를 선택해 주세요');
            }
            await sql`update subscriptions set next_billing_date = ${date}, updated_at = now() where id = ${id}`;
            break;
        }
        case 'retry_now': {
            const result = await chargeSubscription(sub);
            if (!result.ok) return jsonError(result.message, 402);
            await markCharged(sub);
            await enqueue('subscription_charged', { subscriptionId: id, orderNo: result.order.orderNo, amount: result.order.amount }, { userId: sub.userId });
            break;
        }
        default:
            return jsonError('알 수 없는 요청이에요');
    }
    return Response.json({ subscription: await getSubscription(id) });
}
