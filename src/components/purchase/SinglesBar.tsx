'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingBag, X, Zap } from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { FreeShipHint } from './FreeShipHint';
import { CouponHint } from './CouponHint';
import { FLAVORS, MAX_QTY_ONCE, getItem, type CartLine } from '../../lib/catalog';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
/** Single sachets fill one shipping box at this count. */
export const BOX_SIZE = 20;
const skuOf = (flavor: string) => `single:${flavor}`;

/**
 * Phone bottom bar on single-item pages. Either button opens a sheet where the visitor mixes any of the five flavours
 * one sachet at a time (the page's flavour is pre-filled), with a "one box = 20" progress bar that counts single items
 * already in the cart. Single items are hand-picked one by one, which is why they cost more than the sets.
 */
export function SinglesBar({ flavor, qty, setQty }: { flavor: string; qty: number; setQty: (n: number) => void }) {
    const router = useRouter();
    const { lines, addLine, buyNow, hydrated } = useCart();
    const [open, setOpen] = useState(false);
    const [picks, setPicks] = useState<Record<string, number>>({});
    const [added, setAdded] = useState(false);
    useBodyScrollLock(open);

    // Opening the sheet starts from the quantity chosen on the page for this flavour.
    useEffect(() => {
        if (open) setPicks(Object.fromEntries(FLAVORS.map((f) => [f, f === flavor ? qty : 0])));
    }, [open, flavor, qty]);

    const price = getItem(skuOf(flavor))?.price ?? 0;
    const picked = FLAVORS.reduce((s, f) => s + (picks[f] ?? 0), 0);
    const inCart = hydrated
        ? lines.filter((l) => l.mode === 'once' && getItem(l.sku)?.kind === 'single').reduce((s, l) => s + l.qty, 0)
        : 0;
    const cartSinglesAmount = hydrated
        ? lines.filter((l) => l.mode === 'once' && getItem(l.sku)?.kind === 'single').reduce((s, l) => s + (getItem(l.sku)?.price ?? 0) * l.qty, 0)
        : 0;
    const boxCount = inCart + picked;
    const inBox = boxCount % BOX_SIZE === 0 && boxCount > 0 ? BOX_SIZE : boxCount % BOX_SIZE;
    const boxes = Math.ceil(boxCount / BOX_SIZE);
    const amount = picked * price;
    const set20 = getItem('bundle:20');
    const set20Unit = set20 ? Math.round(set20.price / set20.count) : 0;
    const change = (f: string, d: number) => setPicks((p) => ({ ...p, [f]: Math.max(0, Math.min(MAX_QTY_ONCE, (p[f] ?? 0) + d)) }));
    const chosen: CartLine[] = FLAVORS.filter((f) => (picks[f] ?? 0) > 0).map((f) => ({ sku: skuOf(f), qty: picks[f], mode: 'once' }));

    const addCart = () => {
        if (chosen.length === 0) return;
        chosen.forEach((l) => addLine(l));
        setAdded(true);
        setTimeout(() => {
            setAdded(false);
            setOpen(false);
        }, 900);
    };
    const buy = async () => {
        if (chosen.length === 0) return;
        const dest = await buyNow(chosen);
        router.push(dest === 'checkout' ? '/checkout?type=once' : '/cart');
    };

    return (
        <>
            <div className="pd-sticky">
                <div className="pd-sticky__sum">
                    <span>{qty}포</span>
                    <b>{won(price * qty)}</b>
                </div>
                <div className="pd-actions">
                    <button type="button" className="pd-btn pd-btn--cart" onClick={() => setOpen(true)}>
                        <ShoppingBag size={17} />
                        <span>장바구니 담기</span>
                    </button>
                    <button type="button" className="pd-btn pd-btn--buy" onClick={() => setOpen(true)}>
                        <Zap size={17} />
                        <span>바로 구매</span>
                    </button>
                </div>
            </div>

            {open ? (
                <div className="sbar-sheet" role="dialog" aria-modal="true" aria-label="낱개 담기" onClick={() => setOpen(false)}>
                    <div className="sbar-sheet__card" onClick={(e) => e.stopPropagation()}>
                        <div className="sbar-sheet__head">
                            <strong className="sgl__title">
                                낱개 골라 담기 <small>1개 단위 · 여러 맛 섞기 가능</small>
                            </strong>
                            <button type="button" className="sbar-sheet__close" onClick={() => setOpen(false)} aria-label="닫기">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="sgl__box" aria-label={`한 박스 ${BOX_SIZE}개 중 ${inBox}개`}>
                            <p>
                                📦 한 박스 <b>{BOX_SIZE}개</b> 중 <b>{inBox}개</b>
                                {boxes > 1 ? <span> ({boxes}박스째)</span> : null}
                                {inCart > 0 ? <small> · 장바구니 {inCart}개 포함</small> : null}
                            </p>
                            <div className="sgl__bar">
                                <span style={{ width: `${(inBox / BOX_SIZE) * 100}%` }} />
                            </div>
                            {inBox < BOX_SIZE ? (
                                <small className="sgl__left">{BOX_SIZE - inBox}개 더 담으면 한 박스가 꽉 차요</small>
                            ) : (
                                <small className="sgl__left is-full">한 박스가 꽉 찼어요 ✓</small>
                            )}
                        </div>

                        <ul className="sgl__list">
                            {FLAVORS.map((f) => (
                                <li key={f} className={(picks[f] ?? 0) > 0 ? 'is-on' : ''}>
                                    <span>
                                        {f}
                                        {f === flavor ? <em>보던 맛</em> : null}
                                    </span>
                                    <div className="pd-qty__ctl">
                                        <button type="button" onClick={() => change(f, -1)} disabled={(picks[f] ?? 0) <= 0} aria-label={`${f} 1개 빼기`}>
                                            <Minus size={15} />
                                        </button>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            max={MAX_QTY_ONCE}
                                            value={picks[f] ?? 0}
                                            onChange={(e) => setPicks((p) => ({ ...p, [f]: Math.max(0, Math.min(MAX_QTY_ONCE, Math.floor(Number(e.target.value)) || 0)) }))}
                                            aria-label={`${f} 수량`}
                                        />
                                        <button type="button" onClick={() => change(f, 1)} aria-label={`${f} 1개 추가`}>
                                            <Plus size={15} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="sbar-sheet__total">
                            <span>
                                {picked}개 · 개당 {won(price)}
                            </span>
                            <b>{won(amount)}</b>
                        </div>
                        <FreeShipHint subtotal={cartSinglesAmount + amount} className="sgl__hint" />
                        <CouponHint mode="once" subtotal={cartSinglesAmount + amount} noMinimum={false} className="sgl__hint" />
                        {picked >= 15 ? (
                            <Link href="/sets/20" className="sbar-sheet__nudge" onClick={() => setOpen(false)}>
                                💡 맛을 <b>5개 단위</b>로 골라도 괜찮다면 <b className="oc-nowrap">20개 세트가 개당 {won(set20Unit)}</b> · 무료배송 →
                            </Link>
                        ) : null}

                        <div className="pd-actions">
                            <button type="button" className="pd-btn pd-btn--cart" onClick={addCart} disabled={picked === 0}>
                                <ShoppingBag size={17} />
                                <span>{added ? '담았어요 ✓' : '장바구니 담기'}</span>
                            </button>
                            <button type="button" className="pd-btn pd-btn--buy" onClick={buy} disabled={picked === 0}>
                                <Zap size={17} />
                                <span>바로 구매</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
