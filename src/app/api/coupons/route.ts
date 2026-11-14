import { sessionUserId } from '../../../lib/api';
import { listCoupons } from '../../../lib/coupons';

export const runtime = 'edge';

/** The signed-in member's usable coupons (amount + minimum only), for the cart's coupon hint. */
export async function GET() {
    const userId = await sessionUserId();
    if (!userId) return Response.json({ loggedIn: false, coupons: [] });
    const coupons = (await listCoupons(userId)).filter((c) => c.available).map((c) => ({ amount: c.amount, minOrder: c.minOrder }));
    return Response.json({ loggedIn: true, coupons });
}
