import { getSql } from './db';
import { isUuid } from './api';
import { setMarketingConsent } from './consent';
import { SIGNUP_SOURCES, getAvailableCoupon, welcomeUsedElsewhere, type Coupon } from './coupons';

/** The checkout's stand-in id for the 3,000원 notification coupon that does not exist until the consent is given. */
export const CONSENT_PREVIEW_ID = 'consent-coupon';

/**
 * The coupon a checkout asked for. When the customer turned the notification toggle on at checkout, the consent is
 * recorded first (that issues the waiting coupons and the notification coupon), then the chosen coupon is checked.
 */
export async function resolveCheckoutCoupon(
    userId: string,
    raw: unknown,
    marketingOptIn: unknown,
    address: { phone: string; address1: string; address2: string | null },
): Promise<{ coupon: Coupon | null } | { error: string }> {
    let consentId: string | null = null;
    if (marketingOptIn === true) consentId = (await setMarketingConsent(userId, true, 'checkout')).consentCouponId;
    if (!raw) return { coupon: null };

    let id = raw;
    if (raw === CONSENT_PREVIEW_ID) {
        if (!consentId) {
            const b = await getSql()`select id from coupons where user_id = ${userId} and source = 'consent'`;
            consentId = (b[0]?.id as string) ?? null;
        }
        if (!consentId) return { error: '사용할 수 없는 쿠폰이에요' };
        id = consentId;
    }
    if (!isUuid(id)) return { error: '쿠폰을 확인해 주세요' };
    const coupon = await getAvailableCoupon(userId, id);
    if (!coupon) return { error: '사용할 수 없는 쿠폰이에요' };
    if (SIGNUP_SOURCES.includes(coupon.source) && (await welcomeUsedElsewhere(userId, address.phone, address.address1, address.address2))) {
        return { error: '이 배송지(또는 연락처)로 다른 계정에서 이미 가입 혜택 쿠폰을 사용했어요. 가입 혜택 쿠폰(신규 가입·앱 설치·알림 받기)은 배송지 한 곳에 한 번만 쓸 수 있어요.' };
    }
    return { coupon };
}
