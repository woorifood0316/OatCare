import { getSql } from '../../../../lib/db';
import { isUuid, jsonError, sameOrigin, sessionUserId } from '../../../../lib/api';
import { couponDiscount, priceCart, sanitizeLines, type CartLine } from '../../../../lib/catalog';
import { getAddress } from '../../../../lib/addresses';
import { removeCartLines } from '../../../../lib/orders';
import { startSubscription } from '../../../../lib/subscriptions';
import { getAvailableCoupon } from '../../../../lib/coupons';

export const runtime = 'edge';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

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
 * The coupon and the free shaker bottle go on the FIRST group's first order only.
 */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);

    let body: {
        addressId?: unknown;
        paymentMethodId?: unknown;
        expectedAmount?: unknown;
        agreed?: unknown;
        agreedMinPeriod?: unknown;
        couponId?: unknown;
    };
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    if (body.agreed !== true) return jsonError('정기결제 이용 안내에 동의해 주세요');
    if (body.agreedMinPeriod !== true) return jsonError('최소 이용기간(2회) 안내에 동의해 주세요');
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

    const groups = new Map<number, CartLine[]>();
    for (const l of lines) {
        const key = l.cycleDays ?? 30;
        groups.set(key, [...(groups.get(key) ?? []), l]);
    }
    const ordered = [...groups.entries()].sort((a, b) => a[0] - b[0]);
    const firstPriced = priceCart(ordered[0][1], 'subscribe');

    let discount = 0;
    let couponId: string | null = null;
    if (body.couponId) {
        if (!isUuid(body.couponId)) return jsonError('쿠폰을 확인해 주세요');
        const coupon = await getAvailableCoupon(userId, body.couponId);
        if (!coupon) return jsonError('사용할 수 없는 쿠폰이에요');
        discount = couponDiscount(coupon, firstPriced.subtotal, firstPriced.total);
        if (discount <= 0) return jsonError(`${won(coupon.minOrder)} 이상 주문에 사용할 수 있는 쿠폰이에요`);
        couponId = coupon.id;
    }

    const gifted = await sql`select shaker_gifted_at from users where id = ${userId}`;
    const giftEligible = !gifted[0]?.shaker_gifted_at;

    const expected = priced.total - discount;
    if (typeof body.expectedAmount === 'number' && body.expectedAmount !== expected) {
        return jsonError('결제 금액이 바뀌었어요. 다시 확인해 주세요.', 409, { amount: expected });
    }

    const results: GroupResult[] = [];
    const doneCycles = new Set<number>();
    let first = true;
    for (const [cycleDays, groupLines] of ordered) {
        const result = await startSubscription({
            userId,
            lines: groupLines,
            cycleDays,
            address,
            paymentMethodId: body.paymentMethodId,
            discount: first ? discount : 0,
            couponId: first ? couponId : null,
            gift: first && giftEligible,
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
        // Coupon + bottle belong to the first group only. If that charge failed they stay unspent
        // (the coupon is released automatically) so the customer can use them on the retry.
        first = false;
    }

    if (doneCycles.size > 0) {
        await removeCartLines(userId, (l) => l.mode === 'subscribe' && doneCycles.has(l.cycleDays ?? 30));
    }
    return Response.json({ results, allOk: results.every((r) => r.ok) });
}
