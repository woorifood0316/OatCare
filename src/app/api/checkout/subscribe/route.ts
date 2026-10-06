import { getSql } from '../../../../lib/db';
import { isUuid, jsonError, sameOrigin, sessionUserId } from '../../../../lib/api';
import { priceCart, sanitizeLines, type CartLine } from '../../../../lib/catalog';
import { getAddress } from '../../../../lib/addresses';
import { removeCartLines } from '../../../../lib/orders';
import { startSubscription } from '../../../../lib/subscriptions';

export const runtime = 'edge';

interface GroupResult {
    cycleDays: number;
    ok: boolean;
    orderNo?: string;
    subscriptionId?: string;
    amount?: number;
    message?: string;
}

/**
 * Starts subscriptions from the SERVER copy of the cart. Lines are grouped by delivery cycle:
 * each cycle becomes its own subscription (own schedule) with its own first charge.
 */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);

    let body: { addressId?: unknown; paymentMethodId?: unknown; expectedAmount?: unknown; agreed?: unknown };
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    if (body.agreed !== true) return jsonError('정기결제 이용 안내에 동의해 주세요');
    if (!isUuid(body.addressId)) return jsonError('배송지를 선택해 주세요');
    if (!isUuid(body.paymentMethodId)) return jsonError('결제 카드를 선택해 주세요');

    const sql = getSql();
    const address = await getAddress(userId, body.addressId);
    if (!address) return jsonError('배송지를 찾을 수 없어요');
    const method = await sql`select 1 from payment_methods where id = ${body.paymentMethodId} and user_id = ${userId}`;
    if (method.length === 0) return jsonError('결제 카드를 찾을 수 없어요');

    const cart = await sql`select lines from carts where user_id = ${userId}`;
    const lines = sanitizeLines(cart[0]?.lines ?? []).filter((l) => l.mode === 'subscribe');
    const priced = priceCart(lines, 'subscribe');
    if (priced.error) return jsonError(priced.error);
    if (typeof body.expectedAmount === 'number' && body.expectedAmount !== priced.total) {
        return jsonError('장바구니 금액이 바뀌었어요. 다시 확인해 주세요.', 409, { amount: priced.total });
    }

    const groups = new Map<number, CartLine[]>();
    for (const l of lines) {
        const key = l.cycleDays ?? 30;
        groups.set(key, [...(groups.get(key) ?? []), l]);
    }

    const results: GroupResult[] = [];
    const doneCycles = new Set<number>();
    for (const [cycleDays, groupLines] of groups) {
        const result = await startSubscription({
            userId,
            lines: groupLines,
            cycleDays,
            address,
            paymentMethodId: body.paymentMethodId,
        });
        if (result.ok) {
            doneCycles.add(cycleDays);
            results.push({
                cycleDays,
                ok: true,
                orderNo: result.order.orderNo,
                subscriptionId: result.subscriptionId,
                amount: result.order.amount,
            });
        } else {
            results.push({ cycleDays, ok: false, message: result.message });
        }
    }

    if (doneCycles.size > 0) {
        await removeCartLines(userId, (l) => l.mode === 'subscribe' && doneCycles.has(l.cycleDays ?? 30));
    }
    return Response.json({ results, allOk: results.every((r) => r.ok) });
}
