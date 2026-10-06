'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AddressForm } from '../address/AddressForm';
import { getAssetUrl } from '../../utils/assets';
import { getItem, FLAVORS, type PricedCart } from '../../lib/catalog';
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

export function OrderSummary({ priced, mode }: { priced: PricedCart; mode: 'once' | 'subscribe' }) {
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
                <div className="cart-summary__row">
                    <span>{mode === 'subscribe' ? '첫 결제 금액' : '총 결제 금액'}</span>
                    <strong>{won(priced.total)}</strong>
                </div>
            </div>
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
