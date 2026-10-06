'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Repeat } from 'lucide-react';
import { CYCLE_OPTIONS, FLAVORS, MAX_QTY_SUBSCRIBE, priceCart } from '../../lib/catalog';
import { SUB_STATUS_LABEL, type Subscription } from '../../lib/subscription-types';
import { ORDER_STATUS_LABEL, type OrderStatus } from '../../lib/order-status';
import type { Address } from '../../lib/validate';
import type { PaymentMethod } from '../../lib/payment-methods';
import { cardText } from './PaymentMethodManager';

export interface HistoryItem {
    orderNo: string;
    amount: number;
    status: string;
    date: string;
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const fmtDate = (d: string) => `${d.slice(0, 4)}.${d.slice(5, 7)}.${d.slice(8, 10)}`;
const tomorrowKst = () => new Date(Date.now() + 9 * 3600 * 1000 + 86400000).toISOString().slice(0, 10);

function Card({
    sub,
    addresses,
    methods,
    history,
    onUpdate,
}: {
    sub: Subscription;
    addresses: Address[];
    methods: PaymentMethod[];
    history: HistoryItem[];
    onUpdate: (subs: Subscription[]) => void;
}) {
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const priced = priceCart(sub.lines, 'subscribe');
    const canceled = sub.status === 'canceled';

    const act = async (body: Record<string, unknown>) => {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch(`/api/subscriptions/${sub.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (data.subscriptions) onUpdate(data.subscriptions as Subscription[]);
            if (!res.ok) setError((data.error as string) ?? '처리하지 못했어요');
        } catch {
            setError('네트워크 오류가 발생했어요');
        }
        setBusy(false);
        setConfirmCancel(false);
    };

    const currentAddress = addresses.find(
        (a) => a.address1 === sub.shipAddress1 && (a.address2 ?? '') === (sub.shipAddress2 ?? '') && a.recipient === sub.shipName,
    );

    return (
        <section className={`my-card sub-card${canceled ? ' is-canceled' : ''}`}>
            <div className="sub-card__head">
                <h2>
                    {priced.items[0]?.name ?? '정기구독'}
                    {priced.items.length > 1 ? ` 외 ${priced.items.length - 1}건` : ''}
                </h2>
                <span className={`sub-status sub-status--${sub.status}`}>{SUB_STATUS_LABEL[sub.status]}</span>
            </div>

            <ul className="sub-lines">
                {sub.lines.map((l, i) => {
                    const it = priced.items[i];
                    if (!it) return null;
                    const mix = it.mixBreakdown
                        ? FLAVORS.filter((f) => (it.mixBreakdown![f] ?? 0) > 0)
                              .map((f) => `${f} ${it.mixBreakdown![f]}`)
                              .join(' · ')
                        : null;
                    return (
                        <li key={i}>
                            <div>
                                <strong>{it.name}</strong>
                                {mix ? <span>{mix}</span> : null}
                            </div>
                            {canceled ? (
                                <span>× {l.qty}</span>
                            ) : (
                                <select
                                    value={l.qty}
                                    onChange={(e) => act({ action: 'set_qty', index: i, qty: Number(e.target.value) })}
                                    aria-label="수량"
                                    disabled={busy}
                                >
                                    {Array.from({ length: MAX_QTY_SUBSCRIBE }, (_, n) => n + 1).map((n) => (
                                        <option key={n} value={n}>
                                            {n}개
                                        </option>
                                    ))}
                                </select>
                            )}
                            <b>{won(it.amount)}</b>
                        </li>
                    );
                })}
            </ul>

            <dl className="my-dl">
                <div>
                    <dt>회당 결제 금액</dt>
                    <dd>{won(priced.total)}</dd>
                </div>
                <div>
                    <dt>배송 주기</dt>
                    <dd>
                        {canceled ? (
                            `${sub.cycleDays}일마다`
                        ) : (
                            <select value={sub.cycleDays} onChange={(e) => act({ action: 'set_cycle', cycleDays: Number(e.target.value) })} disabled={busy}>
                                {CYCLE_OPTIONS.map((d) => (
                                    <option key={d} value={d}>
                                        {d}일마다
                                    </option>
                                ))}
                            </select>
                        )}
                    </dd>
                </div>
                {!canceled ? (
                    <div>
                        <dt>다음 결제일</dt>
                        <dd>
                            {sub.status === 'active' ? (
                                <input
                                    type="date"
                                    value={sub.nextBillingDate}
                                    min={tomorrowKst()}
                                    onChange={(e) => e.target.value && act({ action: 'set_next_date', date: e.target.value })}
                                    disabled={busy}
                                />
                            ) : (
                                <span>{sub.status === 'past_due' ? '결제 확인 필요' : '일시정지 중'}</span>
                            )}
                        </dd>
                    </div>
                ) : null}
                <div>
                    <dt>배송지</dt>
                    <dd>
                        {canceled || addresses.length === 0 ? (
                            <span>
                                {sub.shipName} · {sub.shipAddress1}
                            </span>
                        ) : (
                            <select
                                value={currentAddress?.id ?? ''}
                                onChange={(e) => e.target.value && act({ action: 'set_address', addressId: e.target.value })}
                                disabled={busy}
                            >
                                {!currentAddress ? <option value="">{sub.shipName} · {sub.shipAddress1}</option> : null}
                                {addresses.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {(a.label || a.recipient) + ' · ' + a.address1}
                                    </option>
                                ))}
                            </select>
                        )}
                    </dd>
                </div>
                {!canceled ? (
                    <div>
                        <dt>결제 카드</dt>
                        <dd>
                            {methods.length === 0 ? (
                                <Link href="/mypage/payment" style={{ color: 'var(--oc-maroon)' }}>
                                    카드 등록하기
                                </Link>
                            ) : (
                                <select
                                    value={sub.paymentMethodId ?? ''}
                                    onChange={(e) => e.target.value && act({ action: 'set_payment_method', paymentMethodId: e.target.value })}
                                    disabled={busy}
                                >
                                    {!sub.paymentMethodId ? <option value="">카드를 선택해 주세요</option> : null}
                                    {methods.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {cardText(m)}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </dd>
                    </div>
                ) : null}
            </dl>

            {sub.status === 'past_due' ? (
                <p className="my-error">결제가 {sub.failCount}회 연속 실패해 구독이 멈췄어요. 카드를 확인한 뒤 다시 결제해 주세요.</p>
            ) : null}
            {sub.status === 'active' && sub.failCount > 0 ? (
                <p className="my-error">최근 결제에 실패했어요. 곧 다시 시도하며, 지금 바로 결제할 수도 있어요.</p>
            ) : null}
            {error ? <p className="my-error">{error}</p> : null}

            {!canceled ? (
                <div className="sub-actions">
                    {sub.status === 'active' ? (
                        <label className="sub-skip">
                            <input
                                type="checkbox"
                                checked={sub.skipNext}
                                onChange={(e) => act({ action: 'skip', value: e.target.checked })}
                                disabled={busy}
                            />
                            <span>이번 회차 건너뛰기</span>
                        </label>
                    ) : null}
                    {sub.status === 'past_due' || (sub.status === 'active' && sub.failCount > 0) ? (
                        <button type="button" className="my-btn my-btn--primary" onClick={() => act({ action: 'retry_now' })} disabled={busy}>
                            {busy ? '결제 중...' : '지금 결제하기'}
                        </button>
                    ) : null}
                    {sub.status === 'active' ? (
                        <button type="button" className="my-btn addr-btn addr-btn--ghost" onClick={() => act({ action: 'pause' })} disabled={busy}>
                            일시정지
                        </button>
                    ) : null}
                    {sub.status === 'paused' || sub.status === 'past_due' ? (
                        <button type="button" className="my-btn addr-btn addr-btn--ghost" onClick={() => act({ action: 'resume' })} disabled={busy}>
                            재개
                        </button>
                    ) : null}
                    {!confirmCancel ? (
                        <button type="button" className="my-withdraw-link" onClick={() => setConfirmCancel(true)}>
                            구독 해지
                        </button>
                    ) : (
                        <span className="sub-confirm">
                            해지하면 이후 결제와 배송이 중단돼요.
                            <button type="button" className="my-btn my-btn--primary" onClick={() => act({ action: 'cancel' })} disabled={busy}>
                                해지하기
                            </button>
                            <button type="button" className="my-withdraw-link" onClick={() => setConfirmCancel(false)}>
                                닫기
                            </button>
                        </span>
                    )}
                </div>
            ) : (
                <p className="cart-note" style={{ textAlign: 'left' }}>
                    {sub.canceledAt ? `${fmtDate(sub.canceledAt.slice(0, 10))} 해지됨` : '해지됨'}
                    {sub.cancelReason ? ` · ${sub.cancelReason}` : ''}
                </p>
            )}

            {history.length > 0 ? (
                <details className="sub-history">
                    <summary>결제 내역 ({history.length})</summary>
                    <ul>
                        {history.map((h) => (
                            <li key={h.orderNo}>
                                <Link href={`/mypage/orders/${h.orderNo}`}>{fmtDate(h.date.slice(0, 10))}</Link>
                                <span>{ORDER_STATUS_LABEL[h.status as OrderStatus] ?? h.status}</span>
                                <b>{won(h.amount)}</b>
                            </li>
                        ))}
                    </ul>
                </details>
            ) : null}
        </section>
    );
}

export function SubscriptionManager({
    initial,
    addresses,
    methods,
    history,
    justStarted,
}: {
    initial: Subscription[];
    addresses: Address[];
    methods: PaymentMethod[];
    history: Record<string, HistoryItem[]>;
    justStarted: boolean;
}) {
    const [subs, setSubs] = useState(initial);

    if (subs.length === 0) {
        return (
            <section className="my-card my-placeholder">
                <Repeat size={24} />
                <p>이용 중인 정기구독이 없어요</p>
                <Link href="/#bundles" className="my-btn my-btn--primary">
                    정기구독 알아보기
                </Link>
            </section>
        );
    }

    return (
        <>
            {justStarted ? <p className="sub-banner">정기구독이 시작됐어요. 첫 회차 결제가 완료됐어요.</p> : null}
            {subs.map((s) => (
                <Card key={s.id} sub={s} addresses={addresses} methods={methods} history={history[s.id] ?? []} onUpdate={setSubs} />
            ))}
        </>
    );
}
