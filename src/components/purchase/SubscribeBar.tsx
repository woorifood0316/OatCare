'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Minus, Plus, Repeat, ShoppingBag, X, Zap } from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { CouponHint } from './CouponHint';
import {
    CYCLE_OPTIONS,
    MIN_SUBSCRIPTION_CHARGES,
    SUBSCRIPTION_DISCOUNT_RATE,
    getItem,
    subscriptionUnitPrice,
    type CartLine,
} from '../../lib/catalog';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

type Mode = 'once' | 'subscribe';

/**
 * Phone bottom bar for sets that can be subscribed (20·30): [일반 구매] [정기구독 5%↓]. Each opens a sheet:
 * one-time = quantity + 장바구니/바로 구매 (with a nudge to subscribe), subscription = delivery cycle + start.
 * On phones this sheet is the only place to buy: the flavour mix picker lives in it (same state as the page's picker,
 * which is shown on wide screens only).
 */
export function SubscribeBar({
    sku,
    qty,
    setQty,
    mixChoice,
    mixErr,
    mixPicker,
}: {
    sku: string;
    qty: number;
    setQty: (n: number) => void;
    mixChoice: Pick<CartLine, 'mix' | 'mixDetail'>;
    mixErr: string | null;
    /** The flavour mix picker (useMixChoice), rendered inside the sheet. */
    mixPicker: React.ReactNode;
}) {
    const router = useRouter();
    const { addLine, buyNow } = useCart();
    const item = getItem(sku);
    const [open, setOpen] = useState<Mode | null>(null);
    const [cycle, setCycle] = useState<number | null>(null);
    const [added, setAdded] = useState(false);
    useBodyScrollLock(open !== null);
    if (!item || !item.subscribable) return null;

    const pct = Math.round(SUBSCRIPTION_DISCOUNT_RATE * 100);
    const subPrice = subscriptionUnitPrice(item);
    const saving = item.price - subPrice;
    const effectiveCycle = cycle ?? item.count;
    const clamp = (n: number) => Math.min(99, Math.max(1, n));

    const addCart = () => {
        if (mixErr) return;
        addLine({ sku, qty, mode: 'once', ...mixChoice });
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };
    const buy = async () => {
        if (mixErr) return;
        const dest = await buyNow({ sku, qty, mode: 'once', ...mixChoice });
        router.push(dest === 'checkout' ? '/checkout?type=once' : '/cart');
    };
    const subscribe = () => {
        if (mixErr) return;
        addLine({ sku, qty: 1, mode: 'subscribe', cycleDays: effectiveCycle, ...mixChoice });
        router.push('/cart');
    };

    return (
        <>
            <div className="sbar" role="group" aria-label="구매 방식">
                <button type="button" className="sbar__once" onClick={() => setOpen('once')}>
                    일반 구매
                </button>
                <button type="button" className="sbar__sub" onClick={() => setOpen('subscribe')}>
                    <span className="sbar__badge">보틀 증정</span>
                    <Repeat size={16} aria-hidden="true" />
                    <span>
                        정기구독 <b>{pct}%↓</b>
                    </span>
                </button>
            </div>

            {open ? (
                <div className="sbar-sheet" role="dialog" aria-modal="true" aria-label={open === 'once' ? '일반 구매' : '정기구독'} onClick={() => setOpen(null)}>
                    <div className="sbar-sheet__card" onClick={(e) => e.stopPropagation()}>
                        <div className="sbar-sheet__head">
                            <div className="sbar-sheet__modes" role="tablist">
                                <button type="button" role="tab" aria-selected={open === 'once'} className={open === 'once' ? 'is-active' : ''} onClick={() => setOpen('once')}>
                                    일반 구매
                                </button>
                                <button type="button" role="tab" aria-selected={open === 'subscribe'} className={open === 'subscribe' ? 'is-active' : ''} onClick={() => setOpen('subscribe')}>
                                    정기구독 {pct}%↓
                                </button>
                            </div>
                            <button type="button" className="sbar-sheet__close" onClick={() => setOpen(null)} aria-label="닫기">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="sbar-sheet__mixbox">{mixPicker}</div>

                        {open === 'once' ? (
                            <>
                                <div className="sbar-sheet__row">
                                    <span>수량</span>
                                    <div className="pd-qty__ctl">
                                        <button type="button" onClick={() => setQty(clamp(qty - 1))} aria-label="수량 줄이기">
                                            <Minus size={15} />
                                        </button>
                                        <input type="number" inputMode="numeric" min={1} max={99} value={qty} onChange={(e) => setQty(clamp(Number(e.target.value) || 1))} aria-label="수량" />
                                        <button type="button" onClick={() => setQty(clamp(qty + 1))} aria-label="수량 늘리기">
                                            <Plus size={15} />
                                        </button>
                                    </div>
                                </div>
                                <div className="sbar-sheet__total">
                                    <span>합계 (무료배송)</span>
                                    <b>{won(item.price * qty)}</b>
                                </div>
                                <button type="button" className="sbar-sheet__nudge" onClick={() => setOpen('subscribe')}>
                                    💡 정기구독하면 <b className="oc-nowrap">매회 {won(saving)} 절약</b> <span className="oc-nowrap">+ 첫 회 쉐이커 보틀 →</span>
                                </button>
                                <CouponHint mode="once" subtotal={item.price * qty} noMinimum className="sbar-sheet__coupon" />
                                <div className="pd-actions">
                                    <button type="button" className="pd-btn pd-btn--cart" onClick={addCart} disabled={!!mixErr}>
                                        <ShoppingBag size={17} />
                                        <span>{added ? '담았어요 ✓' : '장바구니 담기'}</span>
                                    </button>
                                    <button type="button" className="pd-btn pd-btn--buy" onClick={buy} disabled={!!mixErr}>
                                        <Zap size={17} />
                                        <span>바로 구매</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <label className="sbar-sheet__row">
                                    <span>배송 주기</span>
                                    <select value={effectiveCycle} onChange={(e) => setCycle(Number(e.target.value))}>
                                        {CYCLE_OPTIONS.map((d) => (
                                            <option key={d} value={d}>
                                                {d}일마다{d === item.count ? ' (추천)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <div className="sbar-sheet__total">
                                    <span>매회 결제 (무료배송)</span>
                                    <b>
                                        <s>{won(item.price)}</s> {won(subPrice)}
                                    </b>
                                </div>
                                <ul className="sbar-sheet__perks">
                                    <li>
                                        <Check size={14} aria-hidden="true" /> 매회 <b>{pct}% 추가 할인</b> ({won(saving)} 절약)
                                    </li>
                                    <li>
                                        <Check size={14} aria-hidden="true" /> 첫 회 <b>쉐이커 보틀 증정</b>
                                    </li>
                                    <li>
                                        <Check size={14} aria-hidden="true" /> 마이페이지에서 <b>주기 변경·건너뛰기</b>
                                    </li>
                                </ul>
                                <CouponHint mode="subscribe" subtotal={subPrice} noMinimum className="sbar-sheet__coupon" />
                                <button type="button" className="pc2__start" onClick={subscribe} disabled={!!mixErr}>
                                    <Repeat size={16} />
                                    <span>정기구독 시작하기</span>
                                </button>
                                <p className="pc2__min">최소 {MIN_SUBSCRIPTION_CHARGES}회 이용 · 결제일 기준으로 결제·발송</p>
                            </>
                        )}
                    </div>
                </div>
            ) : null}
        </>
    );
}
