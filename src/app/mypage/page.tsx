import Link from 'next/link';
import { Repeat, Package, CreditCard, Ticket, Check, Star, User } from 'lucide-react';
import { MIN_SUBSCRIPTION_CHARGES, SUBSCRIPTION_DISCOUNT_RATE } from '../../lib/catalog';
import { listCoupons } from '../../lib/coupons';
import { getCurrentUser } from '../../lib/current-user';
import { PageHead } from '../../components/mypage/ComingSoon';

export const runtime = 'edge';

export default async function MyHomePage() {
    const user = await getCurrentUser();
    const usable = (await listCoupons(user.id)).filter((c) => c.available);
    const subPct = Math.round(SUBSCRIPTION_DISCOUNT_RATE * 100);
    const coupon = [...usable].sort((x, y) => y.amount - x.amount)[0] ?? null;
    const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

    return (
        <>
            <PageHead title={`${user.name || '회원'}님, 안녕하세요`} desc="구독과 주문, 배송 현황을 한곳에서 확인하세요." />

            <section className="my-card my-hero">
                <div>
                    <h2>
                        <span className="oc-chunk">정기구독으로</span> <span className="oc-chunk">매일 아침을 든든하게</span>
                    </h2>
                    <ul className="my-hero__perks">
                        <li>
                            <Check size={15} aria-hidden="true" />
                            <span>
                                <b>20일·30일</b> 단위로 알아서 배송
                            </span>
                        </li>
                        <li>
                            <Check size={15} aria-hidden="true" />
                            <span>
                                매회 <b>{subPct}% 추가 할인</b>
                            </span>
                        </li>
                        <li>
                            <Check size={15} aria-hidden="true" />
                            <span>
                                첫 회 <b>쉐이커 보틀 증정</b>
                            </span>
                        </li>
                        {coupon ? (
                            <li>
                                <Check size={15} aria-hidden="true" />
                                <span>
                                    보유한 <b>{won(coupon.amount)} 쿠폰</b>도 <span className="oc-chunk">첫 결제에 바로 적용</span>
                                </span>
                            </li>
                        ) : null}
                    </ul>
                    <p className="my-hero__note">최소 {MIN_SUBSCRIPTION_CHARGES}회 이용 조건이에요</p>
                </div>
                <Link href="/#bundles" className="my-btn my-btn--primary">
                    정기구독 알아보기
                </Link>
            </section>

            <div className="my-grid">
                <Link href="/mypage/subscription" className="my-card my-tile">
                    <Repeat size={22} />
                    <strong>정기구독</strong>
                    <span>이용 중인 구독이 없어요</span>
                </Link>
                <Link href="/mypage/orders" className="my-card my-tile">
                    <Package size={22} />
                    <strong>주문·배송</strong>
                    <span>최근 주문이 없어요</span>
                </Link>
                <Link href="/mypage/payment" className="my-card my-tile">
                    <CreditCard size={22} />
                    <strong>결제수단·배송지</strong>
                    <span>등록된 정보가 없어요</span>
                </Link>
                <Link href="/mypage/profile" className="my-card my-tile">
                    <User size={22} />
                    <strong>내 정보</strong>
                    <span>이름·연락처·회원 탈퇴</span>
                </Link>
                <Link href="/mypage/coupons" className="my-card my-tile">
                    <Ticket size={22} />
                    <strong>쿠폰</strong>
                    <span>{usable.length > 0 ? `사용 가능한 쿠폰 ${usable.length}장` : '사용 가능한 쿠폰이 없어요'}</span>
                </Link>
                <Link href="/mypage/reviews" className="my-card my-tile">
                    <Star size={22} />
                    <strong>리뷰 쓰기</strong>
                    <span>리뷰 남기고 쿠폰 받기</span>
                </Link>
            </div>
        </>
    );
}
