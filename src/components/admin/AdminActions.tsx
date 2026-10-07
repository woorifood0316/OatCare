'use client';

import { useConfirm } from '../ui/ConfirmDialog';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CARRIERS, NEXT_STATUSES, type OrderStatus } from '../../lib/order-status';

async function patch(url: string, body: unknown): Promise<string | null> {
    const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return (data.error as string) ?? '처리하지 못했어요';
}

export function AdminOrderActions({
    orderNo,
    status,
    carrier,
    trackingNo,
    canRefund,
}: {
    orderNo: string;
    status: OrderStatus;
    carrier: string | null;
    trackingNo: string | null;
    canRefund: boolean;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [car, setCar] = useState(carrier ?? CARRIERS[0].name);
    const [track, setTrack] = useState(trackingNo ?? '');
    const [reason, setReason] = useState('');
    const [refunding, setRefunding] = useState(false);

    const run = async (body: Record<string, unknown>) => {
        if (busy) return;
        setBusy(true);
        setError('');
        const err = await patch(`/api/admin/orders/${orderNo}`, body);
        setBusy(false);
        if (err) setError(err);
        else {
            setRefunding(false);
            router.refresh();
        }
    };

    const canShip = status === 'paid' || status === 'preparing' || status === 'shipped';
    const next = NEXT_STATUSES[status].filter((s) => s !== 'shipped');

    return (
        <section className="adm-card">
            <h2>처리</h2>
            {next.length > 0 ? (
                <div className="adm-row">
                    {next.map((s) => (
                        <button key={s} type="button" className="adm-btn" disabled={busy} onClick={() => run({ action: 'set_status', status: s })}>
                            {s === 'preparing' ? '상품 준비 중으로 변경' : s === 'delivered' ? '배송 완료로 변경' : s}
                        </button>
                    ))}
                </div>
            ) : null}

            {canShip ? (
                <div className="adm-form">
                    <strong>{status === 'shipped' ? '운송장 수정' : '발송 처리'}</strong>
                    <div className="adm-row">
                        <select value={car} onChange={(e) => setCar(e.target.value)} aria-label="택배사">
                            {CARRIERS.map((c) => (
                                <option key={c.id} value={c.name}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <input value={track} onChange={(e) => setTrack(e.target.value)} placeholder="운송장 번호" inputMode="numeric" aria-label="운송장 번호" />
                        <button type="button" className="adm-btn adm-btn--primary" disabled={busy} onClick={() => run({ action: 'ship', carrier: car, trackingNo: track })}>
                            {status === 'shipped' ? '저장' : '발송 처리 (고객 알림)'}
                        </button>
                    </div>
                </div>
            ) : null}

            {canRefund ? (
                !refunding ? (
                    <button type="button" className="adm-btn adm-btn--danger-ghost" onClick={() => setRefunding(true)}>
                        주문 취소 · 환불
                    </button>
                ) : (
                    <div className="adm-form">
                        <strong>전액 환불</strong>
                        <div className="adm-row">
                            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="취소 사유 (고객에게 안내돼요)" aria-label="취소 사유" />
                            <button type="button" className="adm-btn adm-btn--danger" disabled={busy} onClick={() => run({ action: 'cancel', reason })}>
                                {busy ? '환불 중...' : '환불 실행'}
                            </button>
                            <button type="button" className="adm-btn" onClick={() => setRefunding(false)}>
                                닫기
                            </button>
                        </div>
                    </div>
                )
            ) : null}
            {error ? <p className="adm-error">{error}</p> : null}
        </section>
    );
}

export function AdminSubActions({ id, status, failCount, nextDate }: { id: string; status: string; failCount: number; nextDate: string }) {
    const { confirm, dialog } = useConfirm();
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [date, setDate] = useState(nextDate);

    const run = async (body: Record<string, unknown>, confirmText?: string) => {
        if (busy) return;
        if (confirmText && !(await confirm({ title: '확인해 주세요', body: confirmText, icon: '⚠️', confirmLabel: '실행', danger: true }))) return;
        setBusy(true);
        setError('');
        const err = await patch(`/api/admin/subscriptions/${id}`, body);
        setBusy(false);
        if (err) setError(err);
        else router.refresh();
    };

    if (status === 'canceled') return <span className="adm-muted">해지됨</span>;
    return (
        <div className="adm-actions">
            {dialog}
            <div className="adm-row">
                {status === 'active' ? (
                    <button type="button" className="adm-btn" disabled={busy} onClick={() => run({ action: 'pause' })}>
                        일시정지
                    </button>
                ) : (
                    <button type="button" className="adm-btn" disabled={busy} onClick={() => run({ action: 'resume' })}>
                        재개
                    </button>
                )}
                {status === 'past_due' || failCount > 0 || status === 'active' ? (
                    <button
                        type="button"
                        className="adm-btn adm-btn--primary"
                        disabled={busy}
                        onClick={() => run({ action: 'retry_now' }, '지금 고객 카드로 실제 결제가 진행돼요. 계속할까요?')}
                    >
                        지금 결제
                    </button>
                ) : null}
                <button
                    type="button"
                    className="adm-btn adm-btn--danger-ghost"
                    disabled={busy}
                    onClick={() => run({ action: 'cancel', reason: '관리자 해지' }, '이 구독을 해지할까요?')}
                >
                    해지
                </button>
            </div>
            <div className="adm-row">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="다음 결제일" />
                <button type="button" className="adm-btn" disabled={busy || date === nextDate} onClick={() => run({ action: 'set_next_date', date })}>
                    결제일 변경
                </button>
            </div>
            {error ? <p className="adm-error">{error}</p> : null}
        </div>
    );
}

export function AdminCronButtons() {
    const { confirm, dialog } = useConfirm();
    const router = useRouter();
    const [busy, setBusy] = useState('');
    const [result, setResult] = useState('');

    const run = async (job: 'billing' | 'notify', confirmText?: string) => {
        if (busy) return;
        if (confirmText && !(await confirm({ title: '확인해 주세요', body: confirmText, icon: '⚠️', confirmLabel: '실행', danger: true }))) return;
        setBusy(job);
        setResult('');
        try {
            const res = await fetch('/api/admin/cron', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job }) });
            const data = await res.json().catch(() => ({}));
            setResult(res.ok ? JSON.stringify(data) : (data.error as string) ?? '실행하지 못했어요');
            router.refresh();
        } catch {
            setResult('네트워크 오류');
        }
        setBusy('');
    };

    return (
        <section className="adm-card">
            {dialog}
            <h2>수동 실행</h2>
            <p className="adm-muted">스케줄러가 매일 자동으로 하는 일을 지금 바로 실행해요.</p>
            <div className="adm-row">
                <button
                    type="button"
                    className="adm-btn adm-btn--primary"
                    disabled={Boolean(busy)}
                    onClick={() => run('billing', '결제일이 된 모든 구독에 대해 실제 결제를 진행해요. 계속할까요?')}
                >
                    {busy === 'billing' ? '실행 중...' : '오늘 결제 실행'}
                </button>
                <button type="button" className="adm-btn" disabled={Boolean(busy)} onClick={() => run('notify')}>
                    {busy === 'notify' ? '발송 중...' : '알림 발송'}
                </button>
            </div>
            {result ? <pre className="adm-pre">{result}</pre> : null}
        </section>
    );
}
