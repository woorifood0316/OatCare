import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: '주문·결제 | 참오트케어',
    robots: { index: false, follow: false },
};

export default function CheckoutPage() {
    return (
        <main className="cart-page">
            <div className="cart-empty">
                <p>결제 기능을 준비하고 있어요.</p>
                <p className="cart-note">곧 오픈할 예정이에요. 담아두신 상품은 장바구니에 그대로 있어요.</p>
                <Link href="/cart" className="my-btn my-btn--primary">
                    장바구니로 돌아가기
                </Link>
            </div>
        </main>
    );
}
