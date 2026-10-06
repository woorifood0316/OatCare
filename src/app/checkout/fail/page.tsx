import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '../../../lib/current-user';
import { failPendingOrder } from '../../../lib/payments';

export const runtime = 'edge';

export const metadata: Metadata = {
    title: '결제 실패 | 참오트케어',
    robots: { index: false, follow: false },
};

export default async function CheckoutFailPage({
    searchParams,
}: {
    searchParams: Promise<{ code?: string; message?: string; orderId?: string }>;
}) {
    const { code, message, orderId } = await searchParams;
    const user = await getCurrentUser('/cart');
    const reason = (message ?? '결제가 취소되었거나 실패했어요').slice(0, 200);
    if (orderId) await failPendingOrder(user.id, orderId, `${code ?? 'FAIL'}: ${reason}`);

    return (
        <main className="cart-page co-page">
            <div className="co-result">
                <div className="co-result__icon is-fail">!</div>
                <h1>결제가 완료되지 않았어요</h1>
                <p>{reason}</p>
                <div className="co-result__actions">
                    <Link href="/checkout?type=once" className="my-btn my-btn--primary">
                        다시 결제하기
                    </Link>
                    <Link href="/cart" className="my-btn addr-btn addr-btn--ghost">
                        장바구니로
                    </Link>
                </div>
            </div>
        </main>
    );
}
