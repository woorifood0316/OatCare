import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '../../../lib/current-user';
import { finalizeWidgetPayment } from '../../../lib/payments';
import { OrderBrief } from '../../../components/checkout/OrderBrief';

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
    if (!result.ok) return <Result ok={false} message={result.message} />;

    return (
        <Result ok message="결제가 완료됐어요">
            <OrderBrief order={result.order} />
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
