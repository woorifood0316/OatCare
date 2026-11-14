'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReturnKind, ReturnStatus } from '../../lib/return-rules';

/** Approve (회수 접수) → complete (환불 실행 / 교환 재발송), or reject with a reason. */
export function ReturnAdminActions({ id, status, type, estimate }: { id: string; status: ReturnStatus; type: ReturnKind; estimate: number }) {
    const router = useRouter();
    const [note, setNote] = useState('');
    const [reason, setReason] = useState('');
    const [amount, setAmount] = useState(String(estimate));
    const [rejecting, setRejecting] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const run = async (body: Record<string, unknown>, confirmText?: string) => {
        if (busy) return;
        if (confirmText && !window.confirm(confirmText)) return;
        setBusy(true);
        setError('');
        const res = await fetch(`/api/admin/returns/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return setError((data.error as string) ?? '처리하지 못했어요');
        setRejecting(false);
        router.refresh();
    };

    if (status !== 'requested' && status !== 'approved') return null;
    return (
        <div className="adm-rt-actions">
            {rejecting ? (
                <>
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="반려 사유 (고객에게 안내돼요)" maxLength={300} />
                    <div className="adm-row">
                        <button type="button" className="adm-btn" onClick={() => setRejecting(false)} disabled={busy}>
                            닫기
                        </button>
                        <button type="button" className="adm-btn adm-btn--danger" onClick={() => run({ action: 'reject', reason })} disabled={busy}>
                            반려
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={status === 'requested' ? '고객 안내 (선택, 예: 11/20 회수 예정)' : type === 'exchange' ? '재발송 운송장 등 (선택)' : '안내 (선택)'} maxLength={300} />
                    {status === 'approved' && type === 'refund' ? (
                        <label className="adm-rt-amount">
                            환불 금액
                            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />원
                        </label>
                    ) : null}
                    <div className="adm-row">
                        {status === 'requested' ? (
                            <button type="button" className="adm-btn adm-btn--primary" onClick={() => run({ action: 'approve', note })} disabled={busy}>
                                승인 (회수 접수)
                            </button>
                        ) : type === 'refund' ? (
                            <button
                                type="button"
                                className="adm-btn adm-btn--primary"
                                onClick={() => run({ action: 'complete', refundAmount: Number(amount), note }, `${Number(amount).toLocaleString('ko-KR')}원을 실제로 환불(결제 부분 취소)해요. 계속할까요?`)}
                                disabled={busy}
                            >
                                검수 완료 · 환불 실행
                            </button>
                        ) : (
                            <button type="button" className="adm-btn adm-btn--primary" onClick={() => run({ action: 'complete', note })} disabled={busy}>
                                교환 재발송 완료
                            </button>
                        )}
                        <button type="button" className="adm-btn adm-btn--danger-ghost" onClick={() => setRejecting(true)} disabled={busy}>
                            반려
                        </button>
                    </div>
                </>
            )}
            {error ? <small className="adm-error">{error}</small> : null}
        </div>
    );
}
