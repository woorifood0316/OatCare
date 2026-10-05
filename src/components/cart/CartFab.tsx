'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useCart } from './CartProvider';

// Pages where a floating cart button would only get in the way.
const HIDDEN_PREFIXES = ['/cart', '/checkout', '/mypage', '/login', '/signup', '/admin', '/privacy', '/terms'];

export function CartFab() {
    const { count, toast, hydrated } = useCart();
    const pathname = usePathname() ?? '/';
    if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

    return (
        <>
            {toast ? (
                <div className="cart-toast" role="status">
                    <span>{toast}</span>
                    <Link href="/cart">보러가기</Link>
                </div>
            ) : null}
            {hydrated && count > 0 ? (
                <Link href="/cart" className="cart-fab" aria-label={`장바구니 ${count}개`}>
                    <ShoppingCart size={22} />
                    <span className="cart-fab__badge">{count}</span>
                </Link>
            ) : null}
        </>
    );
}
