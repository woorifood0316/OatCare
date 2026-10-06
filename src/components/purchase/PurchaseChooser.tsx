'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Repeat, Check } from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import {
    CYCLE_OPTIONS,
    MIN_SUBSCRIPTION_CHARGES,
    SUBSCRIPTION_DISCOUNT_RATE,
    getItem,
    subscriptionUnitPrice,
} from '../../lib/catalog';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/**
 * Side-by-side "한 번만 구매" / "정기구독" choice for 20·30-pack sets.
 * Nothing is pre-selected: each option has its own button, so the customer always chooses explicitly.
 */
export function PurchaseChooser({
    sku,
    qty = 1,
    onAdded,
}: {
    sku: string;
    /** Quantity used for the one-time option (the subscription starts at 1 and is edited in the cart). */
    qty?: number;
    onAdded?: () => void;
}) {
    const router = useRouter();
    const { addLine } = useCart();
    const item = getItem(sku);
    const [cycle, setCycle] = useState<number | null>(null);

    if (!item || !item.subscribable) return null;

    const onceUnit = Math.round(item.price / item.count);
    const subPrice = subscriptionUnitPrice(item);
    const subUnit = Math.round(subPrice / item.count);
    const saving = item.price - subPrice;
    const pct = Math.round(SUBSCRIPTION_DISCOUNT_RATE * 100);
    const effectiveCycle = cycle ?? item.count;

    const addOnce = () => {
        addLine({ sku, qty, mode: 'once', mix: 'all' });
        onAdded?.();
    };
    const startSubscription = () => {
        addLine({ sku, qty: 1, mode: 'subscribe', cycleDays: effectiveCycle, mix: 'all' });
        onAdded?.();
        router.push('/cart');
    };

    return (
        <div className="pc" role="group" aria-label="구매 방식 선택">
            <div className="pc__opt">
                <span className="pc__label">한 번만 구매</span>
                <strong className="pc__price">{won(item.price)}</strong>
                <span className="pc__unit">개당 {won(onceUnit)}</span>
                <button type="button" className="pc__btn pc__btn--once" onClick={addOnce}>
                    <ShoppingBag size={15} />
                    <span>장바구니 담기</span>
                </button>
            </div>

            <div className="pc__opt pc__opt--sub">
                <span className="pc__ribbon">추천 · 가장 경제적인 구매 방법!</span>
                <span className="pc__label">정기구독</span>
                <div className="pc__price-row">
                    <strong className="pc__price">{won(subPrice)}</strong>
                    <span className="pc__per">/ 매회</span>
                    <s className="pc__was">{won(item.price)}</s>
                </div>
                <span className="pc__unit">
                    개당 {won(subUnit)} · 매회 {won(saving)} 절약
                </span>
                <ul className="pc__perks">
                    <li>
                        <Check size={13} /> {pct}% 추가 할인
                    </li>
                    <li>
                        <Check size={13} /> 첫 회 쉐이커 보틀 증정
                    </li>
                    <li>
                        <Check size={13} /> 떨어질 걱정 없이, 매일 든든한 아침
                    </li>
                </ul>
                <label className="pc__cycle">
                    <span>배송 주기</span>
                    <select value={effectiveCycle} onChange={(e) => setCycle(Number(e.target.value))}>
                        {CYCLE_OPTIONS.map((d) => (
                            <option key={d} value={d}>
                                {d}일마다{d === item.count ? ' (추천)' : ''}
                            </option>
                        ))}
                    </select>
                </label>
                <button type="button" className="pc__btn pc__btn--sub" onClick={startSubscription}>
                    <Repeat size={15} />
                    <span>정기구독 시작하기</span>
                </button>
                <span className="pc__min">
                    최소 {MIN_SUBSCRIPTION_CHARGES}회 이용 · 결제일 기준 결제·발송 · 마이페이지에서 언제든 주기 변경
                </span>
            </div>
        </div>
    );
}
