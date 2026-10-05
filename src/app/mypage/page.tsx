import Link from 'next/link';
import { Repeat, Package, CreditCard } from 'lucide-react';
import { getCurrentUser } from '../../lib/current-user';
import { PageHead } from '../../components/mypage/ComingSoon';

export const runtime = 'edge';

export default async function MyHomePage() {
    const user = await getCurrentUser();

    return (
        <>
            <PageHead title={`${user.name || '회원'}님, 안녕하세요`} desc="구독과 주문, 배송 현황을 한곳에서 확인하세요." />

            <section className="my-card my-hero">
                <div>
                    <h2>정기구독으로 매일 아침을 든든하게</h2>
                    <p>20일·30일 단위로 알아서 보내드려요. 주기는 언제든 바꾸거나 건너뛸 수 있어요.</p>
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
            </div>
        </>
    );
}
