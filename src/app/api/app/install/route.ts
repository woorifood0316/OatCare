import { consentGain, grantInstallReward, installOffer } from '../../../../lib/coupons';
import { jsonError, sameOrigin, sessionUserId } from '../../../../lib/api';

export const runtime = 'edge';

/** Has this member opened the home-screen app, and what would opening it give (for the install cards). */
export async function GET() {
    const userId = await sessionUserId();
    if (!userId) return Response.json({ member: false, installed: false, offer: 'raise' });
    const offer = await installOffer(userId);
    return Response.json({ member: true, installed: offer === null, offer });
}

/**
 * The page is running from the home-screen icon (the browser says display-mode: standalone). The first time per
 * member this raises the sign-up coupon to 3,000원 or gives a 2,000원 coupon (see lib/coupons grantInstallReward).
 * `consentNext`: the notification coupon is still there to get (shown as the next step).
 */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('로그인이 필요해요', 401);
    const body = (await request.json().catch(() => ({}))) as { standalone?: unknown };
    if (body.standalone !== true) return jsonError('Bad Request', 400);
    const given = await grantInstallReward(userId);
    const consentNext = given ? (await consentGain(userId)).consentCoupon : false;
    return Response.json({ given, consentNext });
}
