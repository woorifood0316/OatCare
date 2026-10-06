'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AddressForm } from '../address/AddressForm';
import { getAssetUrl } from '../../utils/assets';
import { getItem, FLAVORS, GIFT_SHAKER_NAME, couponDiscount, type PricedCart } from '../../lib/catalog';
import type { Coupon } from '../../lib/coupons';
import type { Address, AddressInput } from '../../lib/validate';

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export function CheckoutShell({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <main className="cart-page co-page">
            <header className="cart-page__head">
                <Link href="/cart" className="cart-back">
                    <ArrowLeft size={18} />
                    <span>장바구니로</span>
                </Link>
                <h1>{title}</h1>
            </header>
            {children}
        </main>
    );
}

export function OrderSummary({
    priced,
    mode,
    discount = 0,
    gift = false,
}: {
    priced: PricedCart;
    mode: 'once' | 'subscribe';
    discount?: number;
    gift?: boolean;
}) {
    return (
        <section className="cart-section">
            <h2 className="co-h2">주문 상품</h2>
            <ul className="co-items">
                {priced.items.map((it, i) => {
                    const item = getItem(it.sku);
                    const mix = it.mixBreakdown
                        ? FLAVORS.filter((f) => (it.mixBreakdown![f] ?? 0) > 0)
                              .map((f) => `${f} ${it.mixBreakdown![f]}`)
                              .join(' · ')
                        : null;
                    return (
                        <li key={i} className="co-item">
                            {item ? <img src={getAssetUrl(item.img)} alt="" /> : null}
                            <div>
                                <strong>{it.name}</strong>
                                {mix ? <span>{mix}</span> : null}
                                {mode === 'subscribe' && it.cycleDays ? <span>{it.cycleDays}일마다 정기 배송</span> : null}
                                <span>
                                    {won(it.unitPrice)} × {it.qty}개
                                </span>
                            </div>
                            <b>{won(it.amount)}</b>
                        </li>
                    );
                })}
                {gift ? (
                    <li className="co-item co-item--gift">
                        <div className="co-item__gift-icon" aria-hidden>
                            🎁
                        </div>
                        <div>
                            <strong>{GIFT_SHAKER_NAME}</strong>
                            <span>첫 회 주문에 함께 보내드려요</span>
                        </div>
                        <b>0원</b>
                    </li>
                ) : null}
            </ul>
            <div className="cart-summary">
                <div className="cart-summary__row cart-summary__row--plain">
                    <span>상품 금액</span>
                    <span>{won(priced.subtotal)}</span>
                </div>
                <div className="cart-summary__row cart-summary__row--plain">
                    <span>배송비</span>
                    <span>{priced.shipping === 0 ? '무료' : won(priced.shipping)}</span>
                </div>
                {discount > 0 ? (
                    <div className="cart-summary__row cart-summary__row--sub">
                        <span>쿠폰 할인</span>
                        <span>-{won(discount)}</span>
                    </div>
                ) : null}
                <div className="cart-summary__row">
                    <span>{mode === 'subscribe' ? '첫 결제 금액' : '총 결제 금액'}</span>
                    <strong>{won(priced.total - discount)}</strong>
                </div>
            </div>
        </section>
    );
}

/** Choose one of the customer's usable coupons (or none). */
export function CouponPicker({
    coupons,
    selectedId,
    onSelect,
    subtotal,
    total,
    note,
}: {
    coupons: Coupon[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    subtotal: number;
    total: number;
    note?: string;
}) {
    const usable = coupons.filter((c) => c.available);
    if (usable.length === 0) return null;
    const exp = (iso: string) => {
        const d = new Date(iso);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}까지`;
    };
    return (
        <section className="cart-section">
            <h2 className="co-h2">쿠폰</h2>
            <ul className="co-addr">
                <li>
                    <label className={`co-addr__item${selectedId === null ? ' is-active' : ''}`}>
                        <input type="radio" name="coupon" checked={selectedId === null} onChange={() => onSelect(null)} />
                        <div>
                            <strong>쿠폰 사용 안 함</strong>
                        </div>
                    </label>
                </li>
                {usable.map((c) => {
                    const ok = couponDiscount(c, subtotal, total) > 0;
                    return (
                        <li key={c.id}>
                            <label className={`co-addr__item${selectedId === c.id ? ' is-active' : ''}${ok ? '' : ' is-disabled'}`}>
                                <input type="radio" name="coupon" disabled={!ok} checked={selectedId === c.id} onChange={() => onSelect(c.id)} />
                                <div>
                                    <strong>
                                        {c.name} · {won(c.amount)} 할인
                                    </strong>
                                    <span>
                                        {exp(c.expiresAt)} · {won(c.minOrder)} 이상 주문 시 사용
                                        {ok ? '' : ' (현재 주문은 사용할 수 없어요)'}
                                    </span>
                                </div>
                            </label>
                        </li>
                    );
                })}
            </ul>
            {note ? (
                <p className="cart-note" style={{ textAlign: 'left' }}>
                    {note}
                </p>
            ) : null}
        </section>
    );
}

/** Pick a saved address or add a new one inline. */
export function AddressPicker({
    initial,
    selectedId,
    onSelect,
}: {
    initial: Address[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}) {
    const [list, setList] = useState(initial);
    const [adding, setAdding] = useState(initial.length === 0);

    const add = async (input: AddressInput) => {
        const res = await fetch('/api/addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return (data.error as string) ?? '저장하지 못했어요';
        setList(data.addresses as Address[]);
        onSelect(data.id as string);
        setAdding(false);
        return null;
    };

    return (
        <section className="cart-section">
            <div className="cart-section__head">
                <h2 className="co-h2">배송지</h2>
                {!adding ? (
                    <button type="button" className="my-link-btn" onClick={() => setAdding(true)}>
                        + 새 배송지
                    </button>
                ) : null}
            </div>

            {list.length > 0 && !adding ? (
                <ul className="co-addr">
                    {list.map((a) => (
                        <li key={a.id}>
                            <label className={`co-addr__item${selectedId === a.id ? ' is-active' : ''}`}>
                                <input type="radio" name="address" checked={selectedId === a.id} onChange={() => onSelect(a.id)} />
                                <div>
                                    <strong>
                                        {a.label || a.recipient} {a.isDefault ? <span className="my-pill is-on">기본</span> : null}
                                    </strong>
                                    <span>
                                        {a.recipient} · {a.phone}
                                    </span>
                                    <span>
                                        {a.zipcode ? `(${a.zipcode}) ` : ''}
                                        {a.address1} {a.address2 ?? ''}
                                    </span>
                                </div>
                            </label>
                        </li>
                    ))}
                </ul>
            ) : null}

            {adding ? (
                <AddressForm
                    submitLabel="배송지 추가"
                    onSubmit={add}
                    onCancel={list.length > 0 ? () => setAdding(false) : undefined}
                />
            ) : null}
        </section>
    );
}
