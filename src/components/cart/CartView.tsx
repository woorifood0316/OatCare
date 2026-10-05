'use client';

import React from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useCart } from './CartProvider';
import {
    CYCLE_OPTIONS,
    CartLine,
    SUBSCRIPTION_DISCOUNT_RATE,
    getItem,
    lineKey,
    maxQty,
    unitPriceOf,
} from '../../lib/catalog';
import { getAssetUrl } from '../../utils/assets';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

function LineRow({ line }: { line: CartLine }) {
    const { setQty, setCycle, removeLine } = useCart();
    const item = getItem(line.sku);
    if (!item) return null;
    const key = lineKey(line);
    const unit = unitPriceOf(line);
    const isSub = line.mode === 'subscribe';

    return (
        <li className="cart-line">
            <img className="cart-line__img" src={getAssetUrl(item.img)} alt="" loading="lazy" />
            <div className="cart-line__body">
                <div className="cart-line__top">
                    <strong>{item.name}</strong>
                    <button type="button" className="cart-line__remove" onClick={() => removeLine(key)} aria-label={`${item.name} 삭제`}>
                        <Trash2 size={16} />
                    </button>
                </div>

                {item.kind === 'bundle' ? (
                    <span className="cart-line__meta">
                        맛 구성: {line.mix === 'custom' ? '단일 맛 선택 (결제 시 선택)' : '5가지 맛 골고루'} · 무료 배송
                    </span>
                ) : null}

                {isSub ? (
                    <label className="cart-line__cycle">
                        배송 주기
                        <select value={line.cycleDays} onChange={(e) => setCycle(key, Number(e.target.value))}>
                            {CYCLE_OPTIONS.map((d) => (
                                <option key={d} value={d}>
                                    {d}일마다
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}

                <div className="cart-line__bottom">
                    <div className="cart-qty">
                        <button type="button" onClick={() => setQty(key, line.qty - 1)} disabled={line.qty <= 1} aria-label="수량 감소">
                            <Minus size={14} />
                        </button>
                        <span>{line.qty}</span>
                        <button type="button" onClick={() => setQty(key, line.qty + 1)} disabled={line.qty >= maxQty(line.mode)} aria-label="수량 증가">
                            <Plus size={14} />
                        </button>
                    </div>
                    <div className="cart-line__price">
                        <strong>{won(unit * line.qty)}</strong>
                        {!isSub && item.listPrice > item.price ? <s>{won(item.listPrice * line.qty)}</s> : null}
                        {isSub ? <em>{Math.round(SUBSCRIPTION_DISCOUNT_RATE * 100)}% 정기 할인</em> : null}
                    </div>
                </div>
            </div>
        </li>
    );
}

function Section({
    title,
    desc,
    lines,
    mode,
    totalLabel,
    cta,
}: {
    title: string;
    desc: string;
    lines: CartLine[];
    mode: CartLine['mode'];
    totalLabel: string;
    cta: string;
}) {
    const { clearMode } = useCart();
    if (lines.length === 0) return null;
    const total = lines.reduce((sum, l) => sum + unitPriceOf(l) * l.qty, 0);
    const listTotal = lines.reduce((sum, l) => sum + (getItem(l.sku)?.listPrice ?? 0) * l.qty, 0);

    return (
        <section className="cart-section">
            <div className="cart-section__head">
                <div>
                    <h2>{title}</h2>
                    <p>{desc}</p>
                </div>
                <button type="button" className="cart-link-btn" onClick={() => clearMode(mode)}>
                    전체 삭제
                </button>
            </div>
            <ul className="cart-lines">
                {lines.map((l) => (
                    <LineRow key={lineKey(l)} line={l} />
                ))}
            </ul>
            <div className="cart-summary">
                <div className="cart-summary__row">
                    <span>{totalLabel}</span>
                    <strong>{won(total)}</strong>
                </div>
                {mode === 'once' && listTotal > total ? (
                    <div className="cart-summary__row cart-summary__row--sub">
                        <span>할인 혜택</span>
                        <span>-{won(listTotal - total)}</span>
                    </div>
                ) : null}
                <Link href={`/checkout?type=${mode}`} className="my-btn my-btn--primary cart-summary__cta">
                    {cta}
                </Link>
            </div>
        </section>
    );
}

export function CartView() {
    const { lines, hydrated } = useCart();
    const once = lines.filter((l) => l.mode === 'once');
    const subs = lines.filter((l) => l.mode === 'subscribe');

    return (
        <main className="cart-page">
            <header className="cart-page__head">
                <Link href="/" className="cart-back">
                    <ArrowLeft size={18} />
                    <span>쇼핑 계속하기</span>
                </Link>
                <h1>장바구니</h1>
            </header>

            {!hydrated ? null : lines.length === 0 ? (
                <div className="cart-empty">
                    <ShoppingCart size={40} />
                    <p>장바구니가 비어 있어요</p>
                    <Link href="/#product-lineup" className="my-btn my-btn--primary">
                        제품 둘러보기
                    </Link>
                </div>
            ) : (
                <>
                    <Section
                        title="일반 구매"
                        desc="한 번만 결제하는 상품이에요."
                        lines={once}
                        mode="once"
                        totalLabel="결제 예정 금액"
                        cta="일반 구매 결제하기"
                    />
                    <Section
                        title="정기구독"
                        desc="선택한 주기마다 자동으로 결제되고 배송돼요. 언제든 마이페이지에서 변경·해지할 수 있어요."
                        lines={subs}
                        mode="subscribe"
                        totalLabel="회당 결제 금액"
                        cta="정기구독 시작하기"
                    />
                    <p className="cart-note">일반 구매와 정기구독은 결제 방식이 달라 각각 따로 결제돼요.</p>
                </>
            )}
        </main>
    );
}
