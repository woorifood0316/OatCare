import type { Metadata } from 'next';
import { CartView } from '../../components/cart/CartView';

export const metadata: Metadata = {
    title: '장바구니 | 참오트케어',
    robots: { index: false, follow: false },
    alternates: { canonical: '/cart' },
};

export default function CartPage() {
    return <CartView />;
}
