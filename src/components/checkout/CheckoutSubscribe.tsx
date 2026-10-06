'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddressPicker, CheckoutShell, OrderSummary, won } from './Parts';
import { CardRegistrar } from '../billing/CardRegistrar';
import { cardText } from '../mypage/PaymentMethodManager';
import type { PricedCart } from '../../lib/catalog';
import type { Address } from '../../lib/validate';
import type { PaymentMethod } from '../../lib/payment-methods';

function addDaysLabel(days: number) {
    const d = new Date(Date.now() + 9 * 3600 * 1000 + days * 86400000);
    return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function CheckoutSubscribe({
    priced,
    addresses,
    methods,
    user,
}: {
    priced: PricedCart;
    addresses: Address[];
    methods: PaymentMethod[];
    customerKey: string;
    user: { name: string | null; email: string | null };
}) {
    const router = useRouter();
    const [addressId, setAddressId] = useState<string | null>(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null);
    const [methodId, setMethodId] = useState<string | null>(methods.find((m) => m.isDefault)?.id ?? methods[0]?.id ?? null);
    const [agreed, setAgreed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [partial, setPartial] = useState<string[]>([]);

    const cycles = useMemo(() => {
        const map = new Map<number, number>();
        for (const it of priced.items) {
            const c = it.cycleDays ?? 30;
            map.set(c, (map.get(c) ?? 0) + it.amount);
        }
        return [...map.entries()].sort((a, b) => a[0] - b[0]);
    }, [priced.items]);

    const start = async () => {
        if (busy) return;
        if (!addressId) return setError('배송지를 선택해 주세요');
        if (!methodId) return setError('결제 카드를 등록해 주세요');
        if (!agreed) return setError('정기결제 이용 안내에 동의해 주세요');
        setBusy(true);
        setError('');
        setPartial([]);
        try {
            const res = await fetch('/api/checkout/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addressId, paymentMethodId: methodId, expectedAmount: priced.total, agreed: true }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError((data.error as string) ?? '정기구독을 시작하지 못했어요');
                if (res.status === 409) setTimeout(() => window.location.reload(), 1200);
                setBusy(false);
                return;
            }
            if (data.allOk) {
                router.push('/mypage/subscription?started=1');
                return;
            }
            const failed = (data.results as { ok: boolean; cycleDays: number; message?: string }[]).filter((r) => !r.ok);
            setPartial(failed.map((f) => `${f.cycleDays}일 주기: ${f.message ?? '결제에 실패했어요'}`));
            setBusy(false);
        } catch {
            setError('네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
            setBusy(false);
        }
    };

    return (
        <CheckoutShell title="정기구독 시작">
            <OrderSummary priced={priced} mode="subscribe" />
            <AddressPicker initial={addresses} selectedId={addressId} onSelect={setAddressId} />

            <section className="cart-section">
                <div className="cart-section__head">
                    <h2 className="co-h2">결제 카드</h2>
                    <CardRegistrar next="/checkout?type=subscribe" label="+ 카드 등록" />
                </div>
                {methods.length === 0 ? (
                    <p className="cart-note" style={{ textAlign: 'left' }}>
                        등록된 카드가 없어요. 카드를 등록하면 이 화면으로 돌아와요.
                    </p>
                ) : (
                    <ul className="co-addr">
                        {methods.map((m) => (
                            <li key={m.id}>
                                <label className={`co-addr__item${methodId === m.id ? ' is-active' : ''}`}>
                                    <input type="radio" name="method" checked={methodId === m.id} onChange={() => setMethodId(m.id)} />
                                    <div>
                                        <strong>
                                            {cardText(m)} {m.isDefault ? <span className="my-pill is-on">기본</span> : null}
                                        </strong>
                                    </div>
                                </label>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="cart-section">
                <h2 className="co-h2">정기결제 안내</h2>
                <ul className="co-terms">
                    <li>지금 첫 회차가 결제되고, 이후 선택한 주기마다 등록한 카드로 자동 결제·배송돼요.</li>
                    {cycles.map(([c, amount]) => (
                        <li key={c}>
                            <b>{c}일 주기</b> · 첫 결제 {won(amount)} · 다음 결제일 {addDaysLabel(c)}
                        </li>
                    ))}
                    <li>가격이 바뀌는 경우 결제 전에 미리 안내해 드려요.</li>
                    <li>마이페이지에서 언제든 주기 변경, 건너뛰기, 일시정지, 해지를 할 수 있어요. 해지하면 이후 결제는 중단돼요.</li>
                    <li>결제에 3회 연속 실패하면 구독이 일시정지되고 안내해 드려요.</li>
                </ul>
                <label className="addr-check">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                    <span>위 정기결제 이용 안내를 확인했으며 동의합니다. (필수)</span>
                </label>
            </section>

            {error ? (
                <p className="my-error co-error" role="alert">
                    {error}
                </p>
            ) : null}
            {partial.length > 0 ? (
                <div className="my-error co-error" role="alert">
                    {partial.map((p) => (
                        <p key={p}>{p}</p>
                    ))}
                    <p>결제되지 않은 상품은 장바구니에 남아 있어요.</p>
                </div>
            ) : null}

            <button type="button" className="my-btn my-btn--primary co-pay" onClick={start} disabled={busy}>
                {busy ? '결제 진행 중...' : `${won(priced.total)} 결제하고 정기구독 시작`}
            </button>
            <p className="cart-note">구독자: {user.name ?? '회원'}{user.email ? ` · ${user.email}` : ''}</p>
        </CheckoutShell>
    );
}
