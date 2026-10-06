'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Zap } from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import { getItem, type CartLine } from '../../lib/catalog';

/**
 * Product-card actions, same layout everywhere:
 *   row 1: [장바구니 담기] [바로 구매]
 *   row 2: [상세보기] (full width, edges aligned with row 1)
 */
export function CardActions({ sku, onDetail }: { sku: string; onDetail?: () => void }) {
    const router = useRouter();
    const { addLine, buyNow } = useCart();
    const item = getItem(sku);
    if (!item) return null;

    const line: CartLine = { sku, qty: 1, mode: 'once', ...(item.kind === 'bundle' ? { mix: 'all' as const } : {}) };

    const goBuy = async () => {
        const dest = await buyNow(line);
        router.push(dest === 'checkout' ? '/checkout?type=once' : '/cart');
    };

    return (
        <div className="ca">
            <button type="button" className="ca__btn ca__btn--cart" onClick={() => addLine(line)}>
                <ShoppingBag size={15} />
                <span>장바구니 담기</span>
            </button>
            <button type="button" className="ca__btn ca__btn--buy" onClick={goBuy}>
                <Zap size={15} />
                <span>바로 구매</span>
            </button>
            {onDetail ? (
                <button type="button" className="ca__btn ca__btn--detail" onClick={onDetail}>
                    <span>상세보기</span>
                </button>
            ) : null}
        </div>
    );
}
