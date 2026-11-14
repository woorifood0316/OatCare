import React from 'react';
import { FREE_SHIPPING_MIN_COUNT, SHIPPING_FEE } from '../../lib/catalog';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/**
 * Free-shipping progress for single items (same rule as priceCart: a set in the order, or 20+ sachets = one full box).
 *   nothing yet → "20개(한 박스) 담으면 무료배송"
 *   below       → "8개 더 담으면 무료배송" + progress bar
 *   reached     → "무료배송 ✓"
 */
export function FreeShipHint({ count, hasBundle = false, className = '' }: { count: number; hasBundle?: boolean; className?: string }) {
    const free = hasBundle || count >= FREE_SHIPPING_MIN_COUNT;
    const left = Math.max(0, FREE_SHIPPING_MIN_COUNT - count);
    const pct = Math.min(100, Math.round((count / FREE_SHIPPING_MIN_COUNT) * 100));

    let text: React.ReactNode;
    if (hasBundle) text = <>세트 포함 주문이라 <b>무료배송</b>이에요 ✓</>;
    else if (free) text = <>한 박스를 채워 <b>무료배송</b>이에요 ✓</>;
    else if (count === 0) text = <>{FREE_SHIPPING_MIN_COUNT}개(한 박스) 담으면 <b>무료배송</b> <span className="oc-nowrap">(미만 배송비 {won(SHIPPING_FEE)})</span></>;
    else text = <><b className="fsh__left">{left}개</b> 더 담으면 <b>무료배송</b></>;

    return (
        <div className={`fsh${free ? ' is-free' : ''}${className ? ` ${className}` : ''}`}>
            <p>{text}</p>
            {!hasBundle && count > 0 && !free ? (
                <div className="fsh__bar" role="progressbar" aria-valuemin={0} aria-valuemax={FREE_SHIPPING_MIN_COUNT} aria-valuenow={count} aria-label="무료배송까지">
                    <span style={{ width: `${pct}%` }} />
                </div>
            ) : null}
        </div>
    );
}
