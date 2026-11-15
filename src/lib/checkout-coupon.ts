import { getSql } from './db';
import { isUuid } from './api';
import { setMarketingConsent } from './consent';
import { getAvailableCoupon, welcomeUsedElsewhere, type Coupon } from './coupons';

/** The checkout's stand-in id for the 2,000원 sign-up bonus coupon that does not exist until the consent is given. */
export const WELCOME_BONUS_PREVIEW_ID = 'welcome-bonus';

/**
 * The coupon a checkout asked for. When the customer turned the notification toggle on at checkout, the consent is
 * recorded first (that issues the waiting coupons and raises the sign-up coupon), then the chosen coupon is checked.
 */
export async function resolveCheckoutCoupon(
    userId: string,
    raw: unknown,
    marketingOptIn: unknown,
    address: { phone: string; address1: string; address2: string | null },
): Promise<{ coupon: Coupon | null } | { error: string }> {
    let bonusId: string | null = null;
    if (marketingOptIn === true) bonusId = (await setMarketingConsent(userId, true, 'checkout')).bonusCouponId;
    if (!raw) return { coupon: null };

    let id = raw;
    if (raw === WELCOME_BONUS_PREVIEW_ID) {
        if (!bonusId) {
            const b = await getSql()`select id from coupons where user_id = ${userId} and source = 'welcome_bonus'`;
            bonusId = (b[0]?.id as string) ?? null;
        }
        if (!bonusId) return { error: '사용할 수 없는 쿠폰이에요' };
        id = bonusId;
    }
    if (!isUuid(id)) return { error: '쿠폰을 확인해 주세요' };
    const coupon = await getAvailableCoupon(userId, id);
    if (!coupon) return { error: '사용할 수 없는 쿠폰이에요' };
    if ((coupon.source === 'welcome' || coupon.source === 'welcome_bonus') && (await welcomeUsedElsewhere(userId, address.phone, address.address1, address.address2))) {
        return { error: '이 배송지(또는 연락처)로 다른 계정에서 이미 신규 가입 쿠폰을 사용했어요. 신규 가입 쿠폰은 배송지 한 곳에 한 번만 쓸 수 있어요.' };
    }
    return { coupon };
}
