'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingBag, X, Zap } from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { CouponHint } from './CouponHint';
import { BOX_SIZE, FLAVORS, MAX_QTY_ONCE, getItem, type CartLine } from '../../lib/catalog';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const skuOf = (flavor: string) => `single:${flavor}`;

/**
 * Mix any of the five flavours one sachet at a time (the page's flavour starts at 1), with a "one box = 20" progress bar
 * that counts single items already in the cart, free-shipping / coupon hints (both unlock at 20 sachets) and the buttons.
 * Used inline on wide screens and inside the phone sheet. Single items are hand-picked one by one, which is why they
 * cost more than the sets.
 */
export function SinglesPicker({ flavor, onDone }: { flavor: string; onDone?: () => void }) {
    const router = useRouter();
    const { lines, addLine, buyNow, hydrated } = useCart();
    const [picks, setPicks] = useState<Record<string, number>>(() => Object.fromEntries(FLAVORS.map((f) => [f, f === flavor ? 1 : 0])));
    const [added, setAdded] = useState(false);

    const price = getItem(skuOf(flavor))?.price ?? 0;
    const picked = FLAVORS.reduce((s, f) => s + (picks[f] ?? 0), 0);
    const inCart = hydrated ? lines.filter((l) => l.mode === 'once' && getItem(l.sku)?.kind === 'single').reduce((s, l) => s + l.qty, 0) : 0;
    const cartHasSet = hydrated && lines.some((l) => l.mode === 'once' && getItem(l.sku)?.kind === 'bundle');
    const boxCount = inCart + picked;
    const inBox = boxCount > 0 && boxCount % BOX_SIZE === 0 ? BOX_SIZE : boxCount % BOX_SIZE;
    const boxes = Math.ceil(boxCount / BOX_SIZE);
    const amount = picked * price;
    const set20 = getItem('bundle:20');
    const set20Unit = set20 ? Math.round(set20.price / set20.count) : 0;
    const setValue = (f: string, n: number) => setPicks((p) => ({ ...p, [f]: Math.max(0, Math.min(MAX_QTY_ONCE, Math.floor(n) || 0)) }));
    const chosen: CartLine[] = FLAVORS.filter((f) => (picks[f] ?? 0) > 0).map((f) => ({ sku: skuOf(f), qty: picks[f], mode: 'once' }));

    const addCart = () => {
        if (chosen.length === 0) return;
        chosen.forEach((l) => addLine(l));
        setAdded(true);
        setTimeout(() => {
            setAdded(false);
            setPicks(Object.fromEntries(FLAVORS.map((f) => [f, 0])));
            onDone?.();
        }, 900);
    };
    const buy = async () => {
        if (chosen.length === 0) return;
        const dest = await buyNow(chosen);
        router.push(dest === 'checkout' ? '/checkout?type=once' : '/cart');
    };

    return (
        <div className="sgl">
            <div className="sgl__box" aria-label={`한 박스 ${BOX_SIZE}개 중 ${inBox}개`}>
                <p>
                    📦 한 박스 <b>{BOX_SIZE}개</b> 중 <b>{inBox}개</b>
                    {boxes > 1 ? <span> ({boxes}박스째)</span> : null}
                    {inCart > 0 ? <small> · 장바구니 {inCart}개 포함</small> : null}
                </p>
                <div className="sgl__bar">
                    <span style={{ width: `${(inBox / BOX_SIZE) * 100}%` }} />
                </div>
                {cartHasSet && inBox < BOX_SIZE ? (
                    <small className="sgl__left">
                        장바구니에 세트가 있어 <b>무료배송</b> · <b>{BOX_SIZE - inBox}개</b> 더 담으면 한 박스 완성
                    </small>
                ) : inBox < BOX_SIZE ? (
                    <small className="sgl__left">
                        <b>{BOX_SIZE - inBox}개</b> 더 담으면 <b>무료배송 + 쿠폰 사용</b>
                    </small>
                ) : (
                    <small className="sgl__left is-full">한 박스 완성! 무료배송 + 쿠폰 사용 가능 ✓</small>
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
                            <button type="button" onClick={() => setValue(f, (picks[f] ?? 0) - 1)} disabled={(picks[f] ?? 0) <= 0} aria-label={`${f} 1개 빼기`}>
                                <Minus size={15} />
                            </button>
                            <input type="number" inputMode="numeric" min={0} max={MAX_QTY_ONCE} value={picks[f] ?? 0} onChange={(e) => setValue(f, Number(e.target.value))} aria-label={`${f} 수량`} />
                            <button type="button" onClick={() => setValue(f, (picks[f] ?? 0) + 1)} aria-label={`${f} 1개 추가`}>
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
            <CouponHint mode="once" count={boxCount} noMinimum={false} className="sgl__hint" />
            {picked >= 15 ? (
                <Link href="/sets/20" className="sbar-sheet__nudge" onClick={onDone}>
                    💡 맛을 <b>5개 단위</b>로 골라도 괜찮다면 <b className="oc-nowrap">20개 세트가 개당 {won(set20Unit)}</b> →
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
    );
}

/** Phone bottom bar on single-item pages: either button opens the SinglesPicker in a sheet. */
export function SinglesBar({ flavor }: { flavor: string }) {
    const [open, setOpen] = useState(false);
    useBodyScrollLock(open);
    const price = getItem(skuOf(flavor))?.price ?? 0;

    return (
        <>
            <div className="pd-sticky">
                <div className="pd-sticky__sum">
                    <span>개당</span>
                    <b>{won(price)}</b>
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
                        <SinglesPicker flavor={flavor} onDone={() => setOpen(false)} />
                    </div>
                </div>
            ) : null}
        </>
    );
}
