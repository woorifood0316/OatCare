import React from 'react';
import { FREE_SHIPPING_MIN, SHIPPING_FEE } from '../../lib/catalog';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/**
 * Free-shipping progress for single items (same rule as priceCart: a set in the order, or 30,000원+, ships free).
 *   nothing yet → "30,000원 이상 구매 시 무료배송"
 *   below       → "9,000원 더 담으면 무료배송" + progress bar
 *   reached     → "무료배송 ✓"
 */
export function FreeShipHint({ subtotal, hasBundle = false, className = '' }: { subtotal: number; hasBundle?: boolean; className?: string }) {
    const free = hasBundle || subtotal >= FREE_SHIPPING_MIN;
    const left = Math.max(0, FREE_SHIPPING_MIN - subtotal);
    const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_MIN) * 100));

    let text: React.ReactNode;
    if (hasBundle) text = <>세트 포함 주문이라 <b>무료배송</b>이에요 ✓</>;
    else if (free) text = <><b>무료배송</b> 조건을 채웠어요 ✓</>;
    else if (subtotal === 0) text = <>{won(FREE_SHIPPING_MIN)} 이상 구매 시 <b>무료배송</b> (미만 배송비 {won(SHIPPING_FEE)})</>;
    else text = <><b className="fsh__left">{won(left)}</b> 더 담으면 <b>무료배송</b></>;

    return (
        <div className={`fsh${free ? ' is-free' : ''}${className ? ` ${className}` : ''}`}>
            <p>{text}</p>
            {!hasBundle && subtotal > 0 && !free ? (
                <div className="fsh__bar" role="progressbar" aria-valuemin={0} aria-valuemax={FREE_SHIPPING_MIN} aria-valuenow={subtotal} aria-label="무료배송까지">
                    <span style={{ width: `${pct}%` }} />
                </div>
            ) : null}
        </div>
    );
}
