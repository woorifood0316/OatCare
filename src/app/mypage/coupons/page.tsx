import Link from 'next/link';
import { Ticket } from 'lucide-react';
import { getCurrentUser } from '../../../lib/current-user';
import { consentGain, listCoupons } from '../../../lib/coupons';
import { CONSENT_COUPON_AMOUNT, CONSENT_COUPON_NAME, COUPON_VALID_DAYS } from '../../../lib/catalog';
import { InstallCard } from '../../../components/app/InstallCard';
import { ConsentUnlock } from '../../../components/mypage/ConsentUnlock';
import { PageHead } from '../../../components/mypage/ComingSoon';
import { InviteNudge } from '../../../components/share/InviteNudge';

export const runtime = 'edge';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const day = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export default async function CouponsPage() {
    const user = await getCurrentUser();
    const coupons = await listCoupons(user.id);
    const usable = coupons.filter((c) => c.available);
    const waiting = coupons.filter((c) => c.pending);
    const done = coupons.filter((c) => !c.available && !c.pending);
    const gain = user.marketingAgreed ? null : await consentGain(user.id).catch(() => null);
    const gainParts: string[] = [];
    if (gain?.consentCoupon) gainParts.push(`${CONSENT_COUPON_NAME} ${won(CONSENT_COUPON_AMOUNT)}`);
    if (gain && gain.pendingIds.length > 0) gainParts.push(`받을 준비 중인 쿠폰 ${gain.pendingIds.length}장`);

    return (
        <>
            <PageHead title="쿠폰" desc="결제할 때 쿠폰을 골라 쓸 수 있어요." />
            <InstallCard />
            {gainParts.length > 0 ? <ConsentUnlock heading="알림 켜고 쿠폰 받기" gainText={gainParts.join(' · ')} /> : null}
            <InviteNudge heading="쿠폰 더 받는 법: 친구 초대" />

            {coupons.length === 0 ? (
                <section className="my-card my-placeholder">
                    <Ticket size={24} />
                    <p>받은 쿠폰이 없어요</p>
                </section>
            ) : null}

            {usable.length > 0 ? (
                <ul className="cpn-list">
                    {usable.map((c) => (
                        <li key={c.id} className="cpn">
                            <div className="cpn__amount">
                                <strong>{won(c.amount)}</strong>
                                <span>할인</span>
                            </div>
                            <div className="cpn__body">
                                <b>{c.name}</b>
                                <span>20·30개 세트·정기구독은 바로 · 낱개·맛보기 세트는 {c.minCount}개(한 박스) 이상 · {day(c.expiresAt)}까지</span>
                            </div>
                            <Link href="/#product-lineup" className="cpn__cta">
                                쓰러 가기
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : null}

            {waiting.length > 0 ? (
                <>
                    <h2 className="my-card__title" style={{ marginTop: '1.4rem' }}>
                        받을 준비 중인 쿠폰
                    </h2>
                    <ul className="cpn-list">
                        {waiting.map((c) => (
                            <li key={c.id} className="cpn is-done">
                                <div className="cpn__amount">
                                    <strong>{won(c.amount)}</strong>
                                    <span>🔒 대기</span>
                                </div>
                                <div className="cpn__body">
                                    <b>{c.name}</b>
                                    <span>이벤트·혜택 알림을 켜면 바로 받아요 · {day(c.expiresAt)}까지 보관</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            ) : null}

            {done.length > 0 ? (
                <>
                    <h2 className="my-card__title" style={{ marginTop: '1.4rem' }}>
                        사용했거나 기간이 지난 쿠폰
                    </h2>
                    <ul className="cpn-list">
                        {done.map((c) => (
                            <li key={c.id} className="cpn is-done">
                                <div className="cpn__amount">
                                    <strong>{won(c.amount)}</strong>
                                    <span>{c.usedAt ? '사용 완료' : '기간 만료'}</span>
                                </div>
                                <div className="cpn__body">
                                    <b>{c.name}</b>
                                    <span>{c.usedAt ? `${day(c.usedAt)} 사용` : `${day(c.expiresAt)} 만료`}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            ) : null}

            <p className="cart-note" style={{ textAlign: 'left' }}>
                쿠폰은 주문 1건에 1장만 쓸 수 있어요. 남은 쿠폰은 받은 날부터 {COUPON_VALID_DAYS}일 안에 다음 주문에 쓰면 돼요. 정기구독은 첫 결제에만 적용돼요. 주문을 취소하면 기간이 남은 쿠폰은 다시 돌려드려요.
            </p>
        </>
    );
}
