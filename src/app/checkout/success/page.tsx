import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '../../../lib/current-user';
import { finalizeWidgetPayment } from '../../../lib/payments';
import { OrderBrief } from '../../../components/checkout/OrderBrief';
import { InviteNudge } from '../../../components/share/InviteNudge';
import { InstallCard } from '../../../components/app/InstallCard';
import { PushOptIn } from '../../../components/app/PushOptIn';

export const runtime = 'edge';

export const metadata: Metadata = {
    title: '결제 결과 | 참오트케어',
    robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
    const { paymentKey, orderId, amount } = await searchParams;
    const user = await getCurrentUser('/mypage/orders');

    if (!paymentKey || !orderId || !amount || !/^\d+$/.test(amount)) {
        return <Result ok={false} message="잘못된 결제 정보예요" />;
    }

    const result = await finalizeWidgetPayment(user.id, { paymentKey, orderId, amount: Number(amount) });
    if (!result.ok) return result.checking ? <Checking message={result.message} /> : <Result ok={false} message={result.message} />;

    return (
        <Result ok message="결제가 완료됐어요">
            <OrderBrief order={result.order} />
            <PushOptIn heading="배송 출발하면 앱 알림으로 알려 드릴까요?" />
            <InstallCard />
            <InviteNudge heading="맛있게 드시고, 친구에게도 알려 주세요" />
        </Result>
    );
}

function Result({ ok, message, children }: { ok: boolean; message: string; children?: React.ReactNode }) {
    return (
        <main className="cart-page co-page">
            <div className="co-result">
                <div className={`co-result__icon${ok ? ' is-ok' : ' is-fail'}`}>{ok ? '✓' : '!'}</div>
                <h1>{ok ? '주문이 완료됐어요' : '결제에 실패했어요'}</h1>
                <p>{message}</p>
                {children}
                <div className="co-result__actions">
                    {ok ? (
                        <Link href="/mypage/orders" className="my-btn my-btn--primary">
                            주문 내역 보기
                        </Link>
                    ) : (
                        <Link href="/cart" className="my-btn my-btn--primary">
                            장바구니로 돌아가기
                        </Link>
                    )}
                    <Link href="/" className="my-btn addr-btn addr-btn--ghost">
                        홈으로
                    </Link>
                </div>
            </div>
        </main>
    );
}

/** The payment company gave no clear answer yet: not a failure, and not to be paid again. */
function Checking({ message }: { message: string }) {
    return (
        <main className="cart-page co-page">
            <div className="co-result">
                <div className="co-result__icon is-wait">…</div>
                <h1>결제 결과를 확인하고 있어요</h1>
                <p>{message}</p>
                <p className="co-result__note">결제가 확인되면 주문 내역에 바로 반영되고 알림을 보내 드려요. 승인되지 않았다면 청구된 금액은 없어요.</p>
                <div className="co-result__actions">
                    <Link href="/mypage/orders" className="my-btn my-btn--primary">
                        주문 내역 보기
                    </Link>
                    <Link href="/" className="my-btn addr-btn addr-btn--ghost">
                        홈으로
                    </Link>
                </div>
            </div>
        </main>
    );
}
