'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { findSkuByName, getItem } from '../../lib/catalog';
import { openBuy } from './BuySheet';
import type { ProductItemDetailed } from '../Sections';
// (type-only import: no runtime cycle with Sections.tsx)

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const STATE_KEY = 'oc-coverflow-state';

/**
 * Landing 5-flavour coverflow: every card is visible, the centred one is the "current" flavour,
 * the others sit tilted and faded on both sides and the ring loops endlessly (circular look).
 * The centred card has [상세보기] (the flavour page) and [바로구매] (the shared purchase sheet at this flavour).
 */
export function FlavorCoverflow({
    products,
    onDetail,
}: {
    products: ProductItemDetailed[];
    onDetail?: (p: ProductItemDetailed) => void;
}) {
    const n = products.length;
    const [active, setActive] = useState(0);
    // The card that wraps from one end to the other must jump, not fly across the centre.
    const prevActive = useRef(active);
    useEffect(() => {
        prevActive.current = active;
    }, [active]);

    // Coming back from a product detail page: restore the centred flavour and the picked quantities.
    // Saved only when the customer taps 상세보기, kept for this tab only, used once.
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STATE_KEY);
            if (!raw) return;
            sessionStorage.removeItem(STATE_KEY);
            const st = JSON.parse(raw) as { active?: number };
            if (typeof st.active === 'number' && st.active >= 0 && st.active < n) {
                prevActive.current = st.active;
                setActive(st.active);
            }
        } catch {
            /* storage unavailable: start fresh */
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openDetail = (p: ProductItemDetailed) => {
        try {
            sessionStorage.setItem(STATE_KEY, JSON.stringify({ active }));
        } catch {
            /* ignore */
        }
        onDetail?.(p);
    };

    // Offset of card i from the centre, in -half..+half (circular).
    const rel = (i: number, a: number) => {
        const half = Math.floor(n / 2);
        return ((i - a + n + half) % n) - half;
    };

    const go = (d: number) => setActive((a) => (a + d + n) % n);

    // Swipe (touch + mouse drag). touch-action: pan-y keeps vertical page scroll working.
    const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
    const onPointerDown = (e: React.PointerEvent) => {
        drag.current = { x: e.clientX, y: e.clientY, moved: false };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (d && Math.abs(e.clientX - d.x) > 8) d.moved = true;
    };
    const onPointerUp = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        // keep `moved` until the click that follows this pointerup has been ignored
        setTimeout(() => (drag.current = null), 0);
    };
    const wasDrag = () => Boolean(drag.current?.moved);

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    };


    return (
        <div className="cf" aria-roledescription="carousel" aria-label="참오트케어 5종 단품">
            <div className="cf__chips" role="tablist" aria-label="맛 선택">
                {products.map((p, i) => {
                    return (
                        <button
                            key={p.flavor}
                            type="button"
                            role="tab"
                            aria-selected={i === active}
                            className={`cf__chip${i === active ? ' is-active' : ''}`}
                            style={{ '--cf-accent': p.accentColor } as React.CSSProperties}
                            onClick={() => setActive(i)}
                        >
                            {p.flavor}
                        </button>
                    );
                })}
            </div>

            <div
                className="cf__stage"
                tabIndex={0}
                onKeyDown={onKey}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => (drag.current = null)}
            >
                <button type="button" className="cf__arrow cf__arrow--prev" onClick={() => go(-1)} aria-label="이전 맛">
                    <ChevronLeft size={22} />
                </button>
                <button type="button" className="cf__arrow cf__arrow--next" onClick={() => go(1)} aria-label="다음 맛">
                    <ChevronRight size={22} />
                </button>

                <div className="cf__track">
                    {products.map((p, i) => {
                        const off = rel(i, active);
                        const jump = Math.abs(off - rel(i, prevActive.current)) > 1;
                        const abs = Math.abs(off);
                        const isCenter = off === 0;
                        const sku = findSkuByName(p.flavor);
                        const item = sku ? getItem(sku) : undefined;
                        const price = item?.price ?? p.price;
                        const list = item?.listPrice ?? p.listPrice;
                        return (
                            <div
                                key={p.flavor}
                                className={`cf__card${isCenter ? ' is-center' : ''}${jump ? ' is-jump' : ''}`}
                                style={
                                    {
                                        '--off': off,
                                        '--abs': abs,
                                        '--cf-accent': p.accentColor,
                                        zIndex: 10 - abs,
                                    } as React.CSSProperties
                                }
                                aria-hidden={!isCenter}
                                onClick={() => {
                                    if (!isCenter && !wasDrag()) setActive(i);
                                }}
                            >
                                <div className="cf__card-inner">
                                    {p.badge ? <span className="cf__badge">{p.badge}</span> : null}
                                    {/* the photo is display-only: a stray tap while swiping must never leave the page */}
                                    <div className="cf__img">
                                        <img src={p.img} alt={`참오트케어 ${p.flavor}`} draggable={false} />
                                    </div>
                                    <span className="cf__tag">{p.tag}</span>
                                    <h4 className="cf__name">
                                        {p.icon} 참오트케어 {p.flavor}
                                    </h4>
                                    <p className="cf__ingr">{p.ingredient}</p>
                                    <div className="cf__price">
                                        <span className="disc">-{Math.round(((list - price) / list) * 100)}%</span>
                                        <strong>{won(price)}</strong>
                                        <s>{won(list)}</s>
                                        <span className="cal">{p.calories}</span>
                                    </div>

                                    {isCenter ? (
                                        <div className="ca ca--two cf__controls">
                                            <button type="button" className="ca__btn ca__btn--detail" onClick={() => openDetail(p)}>
                                                <span>상세보기</span>
                                            </button>
                                            <button type="button" className="ca__btn ca__btn--buy" onClick={() => openBuy({ kind: 'single', flavor: p.flavor })}>
                                                <Zap size={15} />
                                                <span>바로구매</span>
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="cf__dots" aria-hidden="true">
                {products.map((p, i) => (
                    <span key={p.flavor} className={i === active ? 'is-active' : ''} />
                ))}
            </div>

        </div>
    );
}
