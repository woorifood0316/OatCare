'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AddressPicker, CheckoutShell, OrderSummary, won } from './Parts';
import { loadTossSdk as loadSdk } from '../../lib/toss-sdk';
import type { PricedCart } from '../../lib/catalog';
import type { Address } from '../../lib/validate';

const MEMOS = ['', '문 앞에 놓아주세요', '경비실에 맡겨주세요', '배송 전에 연락주세요', '부재 시 연락주세요'];

export function CheckoutOnce({
    priced,
    addresses,
    customerKey,
    user,
}: {
    priced: PricedCart;
    addresses: Address[];
    customerKey: string;
    user: { name: string | null; email: string | null };
}) {
    const [addressId, setAddressId] = useState<string | null>(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null);
    const [memo, setMemo] = useState('');
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const widgets = useRef<any>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await loadSdk();
                if (cancelled || !window.TossPayments) return;
                const clientKey = process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY;
                if (!clientKey) throw new Error('missing client key');
                const w = window.TossPayments(clientKey).widgets({ customerKey });
                await w.setAmount({ currency: 'KRW', value: priced.total });
                await Promise.all([
                    w.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
                    w.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
                ]);
                if (cancelled) return;
                widgets.current = w;
                setReady(true);
            } catch {
                if (!cancelled) setError('결제 모듈을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [customerKey, priced.total]);

    const pay = async () => {
        if (busy) return;
        if (!addressId) {
            setError('배송지를 선택해 주세요');
            return;
        }
        if (!widgets.current) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/checkout/once', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addressId, memo, expectedAmount: priced.total }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError((data.error as string) ?? '주문을 만들지 못했어요');
                if (res.status === 409) setTimeout(() => window.location.reload(), 1200);
                setBusy(false);
                return;
            }
            await widgets.current.requestPayment({
                orderId: data.orderNo,
                orderName: data.orderName,
                successUrl: `${window.location.origin}/checkout/success`,
                failUrl: `${window.location.origin}/checkout/fail`,
                customerName: data.customerName,
                customerEmail: data.customerEmail ?? undefined,
                customerMobilePhone: data.customerMobilePhone,
            });
            // On success Toss redirects away; if we are still here the customer closed the window.
            setBusy(false);
        } catch (e) {
            const msg = (e as { message?: string })?.message;
            setError(msg && !/USER_CANCEL/i.test(String((e as { code?: string })?.code)) ? msg : '결제를 취소했어요');
            setBusy(false);
        }
    };

    return (
        <CheckoutShell title="주문·결제">
            <OrderSummary priced={priced} mode="once" />
            <AddressPicker initial={addresses} selectedId={addressId} onSelect={setAddressId} />

            <section className="cart-section">
                <h2 className="co-h2">배송 요청사항</h2>
                <select className="co-select" value={memo} onChange={(e) => setMemo(e.target.value)} aria-label="배송 요청사항">
                    {MEMOS.map((m) => (
                        <option key={m} value={m}>
                            {m || '요청사항 없음'}
                        </option>
                    ))}
                </select>
            </section>

            <section className="cart-section">
                <h2 className="co-h2">결제 수단</h2>
                <div id="payment-method" />
                <div id="agreement" />
                {!ready && !error ? <p className="cart-note">결제 모듈을 불러오는 중이에요...</p> : null}
            </section>

            {error ? (
                <p className="my-error co-error" role="alert">
                    {error}
                </p>
            ) : null}

            <button type="button" className="my-btn my-btn--primary co-pay" onClick={pay} disabled={!ready || busy}>
                {busy ? '결제 진행 중...' : `${won(priced.total)} 결제하기`}
            </button>
            <p className="cart-note">주문자: {user.name ?? '회원'}{user.email ? ` · ${user.email}` : ''}</p>
        </CheckoutShell>
    );
}
