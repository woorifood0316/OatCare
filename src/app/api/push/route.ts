import { hasPush, pushPublicKey, removePushSubscription, savePushSubscription } from '../../../lib/push';
import { setMarketingConsent } from '../../../lib/consent';
import { jsonError, sameOrigin, sessionUserId } from '../../../lib/api';

export const runtime = 'edge';

/** The site's public key (for PushManager.subscribe) and whether this member has app notifications on any device. */
export async function GET() {
    const userId = await sessionUserId();
    return Response.json({ key: pushPublicKey(), enabled: userId ? await hasPush(userId) : false });
}

/**
 * Turn app notifications on for this device: { subscription, marketing? }. `marketing: true` is the separate, optional
 * event/benefit consent ticked next to it (same as everywhere else: gives the notification coupon once).
 */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('로그인이 필요해요', 401);
    const body = (await request.json().catch(() => ({}))) as { subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }; marketing?: unknown };
    const sub = body.subscription;
    const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint : '';
    const p256dh = typeof sub?.keys?.p256dh === 'string' ? sub.keys.p256dh : '';
    const auth = typeof sub?.keys?.auth === 'string' ? sub.keys.auth : '';
    if (!endpoint.startsWith('https://') || endpoint.length > 1000 || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) {
        return jsonError('알림 정보를 확인하지 못했어요', 400);
    }
    await savePushSubscription(userId, { endpoint, expirationTime: null, keys: { p256dh, auth } }, request.headers.get('user-agent'));
    let consent = { consentCoupon: false, activated: 0 };
    if (body.marketing === true) {
        const r = await setMarketingConsent(userId, true, 'push');
        consent = { consentCoupon: Boolean(r.consentCouponId), activated: r.activated };
    }
    return Response.json({ ok: true, ...consent });
}

/** Turn app notifications off for this device: { endpoint }. */
export async function DELETE(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('로그인이 필요해요', 401);
    const body = (await request.json().catch(() => ({}))) as { endpoint?: unknown };
    if (typeof body.endpoint !== 'string') return jsonError('Bad Request', 400);
    await removePushSubscription(userId, body.endpoint);
    return Response.json({ ok: true });
}
