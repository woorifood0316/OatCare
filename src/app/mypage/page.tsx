import Link from 'next/link';
import { Repeat, Package, CreditCard, Ticket, Check, Star, User, MessageCircleQuestion, Gift, RotateCcw } from 'lucide-react';
import { MIN_SUBSCRIPTION_CHARGES, SUBSCRIPTION_DISCOUNT_RATE } from '../../lib/catalog';
import { listCoupons } from '../../lib/coupons';
import { listSubscriptions } from '../../lib/subscriptions';
import { listOrders } from '../../lib/orders';
import { listPaymentMethods } from '../../lib/payment-methods';
import { listAddresses } from '../../lib/addresses';
import { listReviewables } from '../../lib/reviews';
import { listMyInquiries } from '../../lib/inquiries';
import { myReferrals } from '../../lib/referrals';
import { listMyReturns } from '../../lib/returns';
import { REFERRAL_REWARD } from '../../lib/catalog';
import { MyInviteStrip } from '../../components/share/MyInviteStrip';
import { getCurrentUser } from '../../lib/current-user';
import { PageHead } from '../../components/mypage/ComingSoon';

export const runtime = 'edge';

export default async function MyHomePage() {
    const user = await getCurrentUser();
    const usable = (await listCoupons(user.id)).filter((c) => c.available);
    const safe = async <T,>(f: () => Promise<T>, fallback: T): Promise<T> => {
        try {
            return await f();
        } catch {
            return fallback;
        }
    };
    const [subs, orders, cards, addresses, reviewables, inquiries, refs, returns] = await Promise.all([
        safe(() => listSubscriptions(user.id), []),
        safe(() => listOrders(user.id), []),
        safe(() => listPaymentMethods(user.id), []),
        safe(() => listAddresses(user.id), []),
        safe(() => listReviewables(user.id), []),
        safe(() => listMyInquiries(user.id), []),
        safe(() => myReferrals(user.id), { invited: [], invitedBy: null }),
        safe(() => listMyReturns(user.id), []),
    ]);
    const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
    const liveSubs = subs.filter((x) => x.status !== 'canceled');
    const nextSub = liveSubs.filter((x) => x.status === 'active').sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate))[0];
    const subText =
        liveSubs.length === 0
            ? '이용 중인 구독이 없어요'
            : `이용 중인 구독 ${liveSubs.length}개${nextSub ? ` · 다음 결제 ${md(nextSub.nextBillingDate)}` : liveSubs.some((x) => x.status === 'paused') ? ' · 일시정지' : ''}`;
    const shipping = orders.filter((o) => o.status === 'shipped').length;
    const preparing = orders.filter((o) => o.status === 'paid' || o.status === 'preparing').length;
    const orderText =
        orders.length === 0
            ? '최근 주문이 없어요'
            : shipping > 0
              ? `배송 중 ${shipping}건${preparing > 0 ? ` · 준비 중 ${preparing}건` : ''}`
              : preparing > 0
                ? `상품 준비 중 ${preparing}건`
                : `최근 주문 ${md(orders[0].createdAt.slice(0, 10))}`;
    const openReturns = returns.filter((r) => r.status === 'requested' || r.status === 'approved').length;
    const returnText = openReturns > 0 ? `진행 중 ${openReturns}건` : returns.some((r) => r.status !== 'withdrawn') ? '진행 중인 신청 없음' : '신청 내역 없음';
    const payText = cards.length + addresses.length === 0 ? '등록된 정보가 없어요' : `카드 ${cards.length}장 · 배송지 ${addresses.length}곳`;
    const reviewText = reviewables.length > 0 ? `리뷰 쓸 수 있는 상품 ${reviewables.length}개` : '리뷰 남기고 쿠폰 받기';
    const waiting = inquiries.filter((q) => q.status === 'pending').length;
    const qaText = inquiries.length === 0 ? '내 문의와 답변 확인' : waiting > 0 ? `답변 대기 ${waiting}건` : `문의 ${inquiries.length}건 · 모두 답변 완료`;
    const rewarded = refs.invited.filter((r) => r.status === 'rewarded').length;
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

            <MyInviteStrip invited={refs.invited.length} rewarded={rewarded} />

            <div className="my-grid">
                <Link href="/mypage/subscription" className="my-card my-tile">
                    <Repeat size={22} />
                    <strong>정기구독</strong>
                    <span>{subText}</span>
                </Link>
                <Link href="/mypage/orders" className="my-card my-tile">
                    <Package size={22} />
                    <strong>주문·배송</strong>
                    <span>{orderText}</span>
                </Link>
                <Link href="/mypage/returns" className="my-card my-tile">
                    <RotateCcw size={22} />
                    <strong>교환·반품 내역</strong>
                    <span>{returnText}</span>
                </Link>
                <Link href="/mypage/payment" className="my-card my-tile">
                    <CreditCard size={22} />
                    <strong>결제수단·배송지</strong>
                    <span>{payText}</span>
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
                    <span>{reviewText}</span>
                </Link>
                <Link href="/mypage/inquiries" className="my-card my-tile">
                    <MessageCircleQuestion size={22} />
                    <strong>상품 문의</strong>
                    <span>{qaText}</span>
                </Link>
                <Link href="/mypage/invite" className="my-card my-tile">
                    <Gift size={22} />
                    <strong>친구 초대</strong>
                    <span>{refs.invited.length > 0 ? `초대한 친구 ${refs.invited.length}명` : `친구도 나도 ${REFERRAL_REWARD.toLocaleString('ko-KR')}원 쿠폰`}</span>
                </Link>
            </div>
        </>
    );
}
