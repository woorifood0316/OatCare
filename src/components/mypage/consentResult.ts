import { CONSENT_COUPON_AMOUNT, CONSENT_COUPON_NAME } from '../../lib/catalog';

/** What /api/account/marketing says turning the notifications on gave. */
export interface ConsentResult {
    consentCoupon?: boolean;
    activated?: number;
}

/** "알림 받기 쿠폰 3,000원 · 받을 준비 중이던 쿠폰 1장" or '' when nothing was issued now. */
export function consentGiftText(r: ConsentResult): string {
    const parts: string[] = [];
    if (r.consentCoupon) parts.push(`${CONSENT_COUPON_NAME} ${CONSENT_COUPON_AMOUNT.toLocaleString('ko-KR')}원`);
    if (r.activated && r.activated > 0) parts.push(`받을 준비 중이던 쿠폰 ${r.activated}장`);
    return parts.join(' · ');
}
