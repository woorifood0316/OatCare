'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Repeat, Check, ChevronDown } from 'lucide-react';
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
 * One-time vs subscription for 20·30-pack sets. Collapsed by default so cards stay compact:
 * two buttons side by side; the subscription details open when the customer taps the subscription button.
 * Nothing is pre-selected, and the minimum-use condition is always visible under the buttons.
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
    const [open, setOpen] = useState(false);
    const [cycle, setCycle] = useState<number | null>(null);

    if (!item || !item.subscribable) return null;

    const subPrice = subscriptionUnitPrice(item);
    const subUnit = Math.round(subPrice / item.count);
    const saving = item.price - subPrice;
    const pct = Math.round(SUBSCRIPTION_DISCOUNT_RATE * 100);
    const effectiveCycle = cycle ?? item.count;
    const panelId = `pc-panel-${sku.replace(/\W/g, '')}`;

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
        <div className="pc2" role="group" aria-label="구매 방식 선택">
            <div className="pc2__row">
                <button type="button" className="pc2__btn pc2__btn--once" onClick={addOnce}>
                    <ShoppingBag size={16} />
                    <span>장바구니 담기</span>
                </button>
                <button
                    type="button"
                    className={`pc2__btn pc2__btn--sub${open ? ' is-open' : ''}`}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpen((v) => !v)}
                >
                    <span className="pc2__badge">추천</span>
                    <span className="pc2__sub-label">
                        <b>정기구독</b>
                        <small>{pct}% 할인 · 보틀 증정</small>
                    </span>
                    <ChevronDown size={16} className="pc2__chev" />
                </button>
            </div>

            <p className="pc2__hint">정기구독은 최소 {MIN_SUBSCRIPTION_CHARGES}회 이용 조건이에요</p>

            {open ? (
                <div className="pc2__panel" id={panelId}>
                    <span className="pc2__ribbon">가장 경제적인 구매 방법!</span>
                    <div className="pc2__price-row">
                        <strong>{won(subPrice)}</strong>
                        <span>/ 매회</span>
                        <s>{won(item.price)}</s>
                    </div>
                    <p className="pc2__unit">
                        개당 {won(subUnit)} · 매회 {won(saving)} 절약
                    </p>
                    <ul className="pc2__perks">
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
                    <label className="pc2__cycle">
                        <span>배송 주기</span>
                        <select value={effectiveCycle} onChange={(e) => setCycle(Number(e.target.value))}>
                            {CYCLE_OPTIONS.map((d) => (
                                <option key={d} value={d}>
                                    {d}일마다{d === item.count ? ' (추천)' : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button type="button" className="pc2__start" onClick={startSubscription}>
                        <Repeat size={16} />
                        <span>정기구독 시작하기</span>
                    </button>
                    <p className="pc2__min">
                        최소 {MIN_SUBSCRIPTION_CHARGES}회 이용 · 결제일 기준으로 결제·발송 · 마이페이지에서 주기 변경·해지 예약
                    </p>
                </div>
            ) : null}
        </div>
    );
}
