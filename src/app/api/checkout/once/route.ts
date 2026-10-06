import { getSql } from '../../../../lib/db';
import { isUuid, jsonError, sameOrigin, sessionUserId } from '../../../../lib/api';
import { couponDiscount, orderNameOf, priceCart, sanitizeLines } from '../../../../lib/catalog';
import { getAddress } from '../../../../lib/addresses';
import { getOrCreateCustomerKey, newOrderNo } from '../../../../lib/orders';
import { getAvailableCoupon, reserveCoupon } from '../../../../lib/coupons';

export const runtime = 'edge';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** Creates a pending order from the SERVER copy of the cart. Prices are never taken from the client. */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);

    let body: { addressId?: unknown; memo?: unknown; expectedAmount?: unknown; couponId?: unknown };
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    if (!isUuid(body.addressId)) return jsonError('배송지를 선택해 주세요');
    const address = await getAddress(userId, body.addressId);
    if (!address) return jsonError('배송지를 찾을 수 없어요');
    const memo = typeof body.memo === 'string' ? body.memo.trim().slice(0, 100) : '';

    const sql = getSql();
    const cart = await sql`select lines from carts where user_id = ${userId}`;
    const priced = priceCart(sanitizeLines(cart[0]?.lines ?? []), 'once');
    if (priced.error) return jsonError(priced.error);

    // Optional coupon: validated on the server, never trusting the client's discount.
    let discount = 0;
    let couponId: string | null = null;
    if (body.couponId) {
        if (!isUuid(body.couponId)) return jsonError('쿠폰을 확인해 주세요');
        const coupon = await getAvailableCoupon(userId, body.couponId);
        if (!coupon) return jsonError('사용할 수 없는 쿠폰이에요');
        discount = couponDiscount(coupon, priced.subtotal, priced.total);
        if (discount <= 0) return jsonError(`${won(coupon.minOrder)} 이상 주문에 사용할 수 있는 쿠폰이에요`);
        couponId = coupon.id;
    }
    const amount = priced.total - discount;

    if (typeof body.expectedAmount === 'number' && body.expectedAmount !== amount) {
        return jsonError('결제 금액이 바뀌었어요. 다시 확인해 주세요.', 409, { amount });
    }
    if (amount < 100) return jsonError('결제 금액이 너무 적어요');

    const orderNo = newOrderNo();
    const inserted = await sql`
        insert into orders (order_no, user_id, kind, status, items, subtotal, shipping_fee, amount, discount_amount,
            ship_name, ship_phone, ship_zip, ship_address1, ship_address2, ship_memo)
        values (${orderNo}, ${userId}, 'once', 'pending', ${JSON.stringify(priced.items)}::jsonb,
            ${priced.subtotal}, ${priced.shipping}, ${amount}, ${discount},
            ${address.recipient}, ${address.phone}, ${address.zipcode}, ${address.address1}, ${address.address2}, ${memo || null})
        returning id
    `;

    if (couponId) {
        const held = await reserveCoupon(userId, couponId, inserted[0].id as string);
        if (!held) {
            await sql`update orders set status = 'failed', fail_reason = '쿠폰을 사용할 수 없어요', updated_at = now() where id = ${inserted[0].id}`;
            return jsonError('쿠폰을 사용할 수 없어요. 다시 확인해 주세요.', 409);
        }
        await sql`update orders set coupon_id = ${couponId} where id = ${inserted[0].id}`;
    }

    const user = await sql`select name, email from users where id = ${userId}`;
    return Response.json({
        orderNo,
        orderName: orderNameOf(priced.items),
        amount,
        discount,
        customerKey: await getOrCreateCustomerKey(userId),
        customerName: address.recipient,
        customerEmail: (user[0]?.email as string | null) ?? null,
        customerMobilePhone: address.phone.replace(/\D/g, ''),
    });
}
