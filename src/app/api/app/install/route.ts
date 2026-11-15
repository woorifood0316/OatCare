import { consentGain, grantInstallReward, installOffer } from '../../../../lib/coupons';
import { getSql } from '../../../../lib/db';
import { jsonError, sameOrigin, sessionUserId } from '../../../../lib/api';

export const runtime = 'edge';

/**
 * The sign-up benefit steps for this visitor (install cards, the home benefit band):
 * installed / offer = the app step, consentCoupon = the 3,000원 notification coupon was received.
 */
export async function GET() {
    const userId = await sessionUserId();
    if (!userId) return Response.json({ member: false, installed: false, offer: 'raise', consentCoupon: false, marketingAgreed: false });
    const offer = await installOffer(userId);
    const rows = await getSql()`
        select u.marketing_agreed, exists (select 1 from coupons c where c.user_id = u.id and c.source = 'consent') as consent_coupon
        from users u where u.id = ${userId}
    `;
    return Response.json({
        member: true,
        installed: offer === null,
        offer,
        consentCoupon: Boolean(rows[0]?.consent_coupon),
        marketingAgreed: Boolean(rows[0]?.marketing_agreed),
    });
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
