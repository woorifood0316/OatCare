import { auth } from '../../../../auth';
import { setMarketingConsent } from '../../../../lib/consent';

export const runtime = 'edge';

export async function POST(request: Request) {
    // CSRF guard: only same-origin requests.
    const origin = request.headers.get('origin');
    if (!origin || new URL(origin).host !== new URL(request.url).host) {
        return new Response('Forbidden', { status: 403 });
    }

    const session = await auth();
    if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 });
    }

    let agreed: unknown;
    try {
        ({ agreed } = await request.json());
    } catch {
        return new Response('Bad Request', { status: 400 });
    }
    if (typeof agreed !== 'boolean') {
        return new Response('Bad Request', { status: 400 });
    }

    const r = await setMarketingConsent(session.user.id, agreed, 'mypage');
    // What turning it on gave, so the screen can say so (the 3,000원 coupon, waiting coupons now issued).
    return Response.json({ agreed, consentCoupon: Boolean(r.consentCouponId), activated: r.activated });
}
