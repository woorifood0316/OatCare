import Link from 'next/link';
import { Repeat, Package, CreditCard, Ticket } from 'lucide-react';
import { listCoupons } from '../../lib/coupons';
import { getCurrentUser } from '../../lib/current-user';
import { PageHead } from '../../components/mypage/ComingSoon';

export const runtime = 'edge';

export default async function MyHomePage() {
    const user = await getCurrentUser();
    const usable = (await listCoupons(user.id)).filter((c) => c.available);

    return (
        <>
            <PageHead title={`${user.name || '회원'}님, 안녕하세요`} desc="구독과 주문, 배송 현황을 한곳에서 확인하세요." />

            <section className="my-card my-hero">
                <div>
                    <h2>정기구독으로 매일 아침을 든든하게</h2>
                    <p>20일·30일 단위로 알아서 보내드려요. 5% 추가 할인 + 첫 회 쉐이커 보틀 증정! (최소 2회 이용)</p>
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
                <Link href="/mypage/coupons" className="my-card my-tile">
                    <Ticket size={22} />
                    <strong>쿠폰</strong>
                    <span>{usable.length > 0 ? `사용 가능한 쿠폰 ${usable.length}장` : '사용 가능한 쿠폰이 없어요'}</span>
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
            </div>
        </>
    );
}
