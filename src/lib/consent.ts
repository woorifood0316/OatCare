import { getSql } from './db';
import { enqueue } from './notify';
import { grantConsentRewards } from './coupons';

/**
 * Turn the event/benefit notification consent (광고성 정보 수신 동의) on or off.
 * - On: waiting coupons are issued and the sign-up coupon is raised (once per member).
 * - Off: always allowed, nothing already issued is taken back (정보통신망법: 철회를 방해하거나 불이익을 주지 않음).
 * - Either way the member is told the result (정보통신망법: 수신동의·철회 처리 결과 통지).
 * Returns the id of a separate 2,000원 sign-up bonus coupon when one was created.
 */
export async function setMarketingConsent(userId: string, agreed: boolean, via: string): Promise<{ changed: boolean; bonusCouponId: string | null }> {
    const sql = getSql();
    const rows = await sql`
        update users set marketing_agreed = ${agreed}, marketing_updated_at = now()
        where id = ${userId} and marketing_agreed is distinct from ${agreed}
        returning id
    `;
    const changed = rows.length > 0;
    let bonusCouponId: string | null = null;
    if (agreed) bonusCouponId = (await grantConsentRewards(userId)).bonusCouponId;
    if (changed) {
        const date = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' });
        await enqueue('marketing_consent', { agreed, date, via }, { userId, admin: false });
    }
    return { changed, bonusCouponId };
}
