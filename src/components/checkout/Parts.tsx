'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { backToPrevious, previousPage } from '../../lib/prev-page';
import { ArrowLeft } from 'lucide-react';
import { AddressForm } from '../address/AddressForm';
import { getAssetUrl } from '../../utils/assets';
import {
    getItem,
    FLAVORS,
    GIFT_SHAKER_NAME,
    COUPON_VALID_DAYS,
    WELCOME_BONUS_COUPON_NAME,
    WELCOME_COUPON_AMOUNT,
    WELCOME_COUPON_BONUS,
    WELCOME_COUPON_MIN_COUNT,
    couponDiscount,
    type PricedCart,
} from '../../lib/catalog';
import type { ConsentGain, Coupon } from '../../lib/coupons';
import type { Address, AddressInput } from '../../lib/validate';

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export function CheckoutShell({ title, children }: { title: string; children: React.ReactNode }) {
    const router = useRouter();
    // "바로 구매" from a product page skips the cart, so the back button names where it really goes.
    const [backLabel, setBackLabel] = useState('장바구니로');
    useEffect(() => {
        const prev = previousPage();
        if (prev && prev !== '/cart') setBackLabel('이전 화면으로');
    }, []);
    return (
        <main className="cart-page co-page">
            <header className="cart-page__head">
                <Link href="/cart" className="cart-back" onClick={(e) => backToPrevious(e, () => router.back())}>
                    <ArrowLeft size={18} />
                    <span>{backLabel}</span>
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
    discountLabel = '쿠폰 할인',
    gift = false,
}: {
    priced: PricedCart;
    mode: 'once' | 'subscribe';
    discount?: number;
    discountLabel?: string;
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
                        <span>{discountLabel}</span>
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

/** Best usable coupon for this order (largest discount), or null. Used to pre-select it at checkout. */
/** A coupon as shown at checkout: `raised` / `unlocked` mark what the notification toggle changed. */
export type ShownCoupon = Coupon & { raised?: boolean; unlocked?: boolean };

/** Same id the server maps to the 2,000원 sign-up bonus coupon (lib/checkout-coupon). */
const BONUS_PREVIEW_ID = 'welcome-bonus';

/**
 * The notification toggle at checkout. Off: waiting coupons stay locked. On: they become selectable, the sign-up coupon
 * shows 3,000원 (or a 2,000원 bonus appears when it was used). Nothing is final until the order is placed: the server
 * records the consent and issues the coupons when the pay button is pressed.
 */
export function useConsentCoupons(coupons: Coupon[], gain: ConsentGain | null) {
    const [optIn, setOptIn] = useState(false);
    const offer = Boolean(gain && (gain.pendingIds.length > 0 || gain.welcomeUpgradeId || gain.welcomeBonusNew));
    const shown: ShownCoupon[] = React.useMemo(() => {
        if (!optIn || !gain) return coupons;
        const list: ShownCoupon[] = coupons.map((c) => {
            if (gain.pendingIds.includes(c.id)) return { ...c, pending: false, available: true, unlocked: true };
            if (c.id === gain.welcomeUpgradeId) return { ...c, amount: WELCOME_COUPON_AMOUNT, raised: true };
            return c;
        });
        if (gain.welcomeBonusNew) {
            list.unshift({
                id: BONUS_PREVIEW_ID,
                name: WELCOME_BONUS_COUPON_NAME,
                amount: WELCOME_COUPON_BONUS,
                minCount: WELCOME_COUPON_MIN_COUNT,
                expiresAt: new Date(Date.now() + COUPON_VALID_DAYS * 86400000).toISOString(),
                usedAt: null,
                source: 'welcome_bonus',
                pending: false,
                available: true,
                unlocked: true,
            });
        }
        return list;
    }, [coupons, gain, optIn]);
    const parts: string[] = [];
    if (gain?.welcomeUpgradeId) parts.push(`신규 가입 쿠폰 ${won(WELCOME_COUPON_AMOUNT)}`);
    if (gain?.welcomeBonusNew) parts.push(`가입 추가 쿠폰 ${won(WELCOME_COUPON_BONUS)}`);
    if (gain && gain.pendingIds.length > 0) parts.push(`받을 준비 중인 쿠폰 ${gain.pendingIds.length}장`);
    return { optIn, setOptIn, shown, offer, gainText: parts.join(' · ') };
}

/** The switch shown on top of the coupon list (only while the member has not agreed and there is something to gain). */
export function ConsentSwitch({ on, onChange, gainText }: { on: boolean; onChange: (on: boolean) => void; gainText: string }) {
    return (
        <div className={`co-consent${on ? ' is-on' : ''}`}>
            <div className="co-consent__row">
                <div className="co-consent__text">
                    <strong>🔔 이벤트·혜택 알림 받기</strong>
                    <span>{on ? <>🎉 <b>{gainText}</b>이 적용됐어요</> : <>켜면 <b>{gainText}</b>을 바로 받아요</>}</span>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label="이벤트·혜택 알림 받기"
                    className={`my-switch${on ? ' is-on' : ''}`}
                    onClick={() => onChange(!on)}
                >
                    <span />
                </button>
            </div>
            <p className="co-consent__fine">
                (선택) 쿠폰 만료, 새 맛 출시, 회원 전용 할인 소식을 이메일·카카오톡·문자로 보내 드려요. 주문·결제·배송 안내는 알림 설정과 상관없이 보내 드려요.
                결제하면 동의가 확정되고, 마이페이지 &gt; 내 정보에서 언제든 끌 수 있어요. 이미 받은 쿠폰은 알림을 꺼도 그대로 쓸 수 있어요.
            </p>
        </div>
    );
}

export function bestCouponId(coupons: Coupon[], sachets: number, total: number, noMinimum: boolean): string | null {
    let best: { id: string; d: number } | null = null;
    for (const c of coupons) {
        if (!c.available) continue;
        const d = couponDiscount(c, sachets, total, noMinimum);
        if (d > 0 && (!best || d > best.d)) best = { id: c.id, d };
    }
    return best?.id ?? null;
}

/**
 * Coupon section at checkout. A status line always says whether a coupon is applied, and when the member's coupon
 * does not fit this order it says why and how to use it (add more, or a 20·30 set / subscription).
 */
export function CouponPicker({
    coupons,
    selectedId,
    onSelect,
    sachets,
    total,
    noMinimum = false,
    note,
    consent,
}: {
    coupons: ShownCoupon[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    /** Sachets in the order (a 20-pack counts 20). */
    sachets: number;
    total: number;
    /** Order has a 20·30 set (or is a subscription): the coupon's minimum does not apply. */
    noMinimum?: boolean;
    note?: string;
    /** The notification switch (rendered above the list). */
    consent?: React.ReactNode;
}) {
    const usable = coupons.filter((c) => c.available);
    const locked = coupons.filter((c) => c.pending);
    if (usable.length === 0 && locked.length === 0 && !consent) return null;
    if (usable.length === 0) {
        return (
            <section className="cart-section">
                <h2 className="co-h2">쿠폰</h2>
                {consent}
                <LockedCoupons list={locked} />
            </section>
        );
    }
    const exp = (iso: string) => {
        const d = new Date(iso);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}까지`;
    };
    const fits = usable.filter((c) => couponDiscount(c, sachets, total, noMinimum) > 0);
    const selected = usable.find((c) => c.id === selectedId) ?? null;
    const selectedOff = selected ? couponDiscount(selected, sachets, total, noMinimum) : 0;
    const biggest = [...usable].sort((a, b) => b.amount - a.amount)[0];

    let status: React.ReactNode;
    if (selected && selectedOff > 0) {
        status = (
            <div className="cph is-ok co-coupon-status" role="status">
                <p>
                    🎟️ <b>{selected.name} {won(selectedOff)} 할인</b>이 적용됐어요
                </p>
            </div>
        );
    } else if (fits.length > 0) {
        status = (
            <div className="cph co-coupon-status" role="status">
                <p>
                    🎟️ 이 주문에 쓸 수 있는 쿠폰이 있어요 · <b>아래에서 선택</b>하면 {won(couponDiscount(fits[0], sachets, total, noMinimum))} 할인돼요
                </p>
            </div>
        );
    } else {
        status = (
            <div className="cph co-coupon-status" role="status">
                <p>
                    🎟️ <b>{won(biggest.amount)} 쿠폰</b>은 이 주문에 쓸 수 없어요 · 낱개·맛보기 세트는{' '}
                    <span className="oc-nowrap">{biggest.minCount}개(한 박스)</span>부터 써요 (
                    <span className="oc-nowrap">
                        <b>{biggest.minCount - sachets}개</b> 부족
                    </span>
                    )
                </p>
                <p className="cph__up">
                    <span>
                        <b>20·30개 세트</b>나 <b>정기구독</b>은 개수 상관없이 바로 적용돼요
                    </span>
                    <Link href="/cart">장바구니에서 바꾸기 →</Link>
                </p>
            </div>
        );
    }

    return (
        <section className="cart-section">
            <h2 className="co-h2">쿠폰</h2>
            {consent}
            {status}
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
                    const ok = couponDiscount(c, sachets, total, noMinimum) > 0;
                    return (
                        <li key={c.id}>
                            <label className={`co-addr__item${selectedId === c.id ? ' is-active' : ''}${ok ? '' : ' is-disabled'}`}>
                                <input type="radio" name="coupon" disabled={!ok} checked={selectedId === c.id} onChange={() => onSelect(c.id)} />
                                <div>
                                    <strong>
                                        {c.name} · {won(c.amount)} 할인
                                        {c.raised ? <em className="co-coupon__tag">✨ {won(WELCOME_COUPON_BONUS)} 올랐어요</em> : null}
                                        {c.unlocked ? <em className="co-coupon__tag">🔓 이제 쓸 수 있어요</em> : null}
                                    </strong>
                                    <span>
                                        {exp(c.expiresAt)} · 20·30개 세트·정기구독은 바로, 낱개·맛보기 세트는 {c.minCount}개(한 박스) 이상
                                        {ok ? '' : ' (현재 주문은 사용할 수 없어요)'}
                                    </span>
                                </div>
                            </label>
                        </li>
                    );
                })}
            </ul>
            <LockedCoupons list={locked} />
            {note ? (
                <p className="cart-note" style={{ textAlign: 'left' }}>
                    {note}
                </p>
            ) : null}
        </section>
    );
}

/** Coupons waiting for the notification consent: visible, not selectable. */
function LockedCoupons({ list }: { list: Coupon[] }) {
    if (list.length === 0) return null;
    return (
        <ul className="co-addr co-locked">
            {list.map((c) => (
                <li key={c.id}>
                    <div className="co-addr__item is-disabled">
                        <span aria-hidden="true">🔒</span>
                        <div>
                            <strong>
                                {c.name} · {won(c.amount)} 할인
                            </strong>
                            <span>알림을 켜면 바로 받아요 · 받을 준비 중</span>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}

/** Pick a saved address or add a new one inline. */
/** Small hint under a saved list: where to delete / edit entries (opens in a new tab so checkout is not lost). */
export function ManageHint({ what }: { what: string }) {
    return (
        <p className="co-manage-hint">
            💡 {what}하려면{' '}
            <a href="/mypage/payment" target="_blank" rel="noopener noreferrer">
                마이페이지 → 결제수단·배송지
            </a>
            에서 할 수 있어요.
        </p>
    );
}

export function AddressPicker({
    initial,
    selectedId,
    onSelect,
    ensureRef,
}: {
    initial: Address[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    /** Filled by the picker: resolves to the address id to pay with (saving a filled-in form first), or null + a message. */
    ensureRef?: React.MutableRefObject<(() => Promise<{ id: string | null; error?: string }>) | null>;
}) {
    const [list, setList] = useState(initial);
    const [adding, setAdding] = useState(initial.length === 0);
    const formSubmit = useRef<(() => Promise<string | null>) | null>(null);
    const addedId = useRef<string | null>(null);
    const sectionRef = useRef<HTMLElement>(null);
    const selectedRef = useRef(selectedId);
    selectedRef.current = selectedId;

    if (ensureRef) {
        ensureRef.current = async () => {
            if (!adding && selectedRef.current) return { id: selectedRef.current };
            if (adding && formSubmit.current) {
                addedId.current = null;
                const err = await formSubmit.current();
                sectionRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                if (err) return { id: null, error: err };
                return { id: addedId.current };
            }
            sectionRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            return { id: null, error: '배송지를 선택해 주세요' };
        };
    }

    const add = async (input: AddressInput) => {
        const res = await fetch('/api/addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return (data.error as string) ?? '저장하지 못했어요';
        setList(data.addresses as Address[]);
        addedId.current = data.id as string;
        onSelect(data.id as string);
        setAdding(false);
        return null;
    };

    return (
        <section className="cart-section" ref={sectionRef}>
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

            {list.length > 0 && !adding ? <ManageHint what="저장된 배송지를 삭제하거나 수정" /> : null}

            {adding ? (
                <AddressForm
                    submitLabel="배송지 추가"
                    onSubmit={add}
                    submitRef={formSubmit}
                    onCancel={list.length > 0 ? () => setAdding(false) : undefined}
                />
            ) : null}
        </section>
    );
}
