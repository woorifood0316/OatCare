'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RETURN_REASON_LABEL, RETURN_STATUS_LABEL, RETURN_TYPE_LABEL, type ReturnRequest } from '../../lib/return-rules';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const day = (iso: string) => new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

/** The 교환·반품 card on the order detail page: past / current requests and the button to start one. */
export function ReturnStatus({
    orderNo,
    requests,
    canRequest,
    deadlines,
    justSent,
}: {
    orderNo: string;
    requests: ReturnRequest[];
    canRequest: boolean;
    deadlines: string | null;
    justSent: boolean;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const withdraw = async (id: string) => {
        if (busy) return;
        setBusy(true);
        setError('');
        const res = await fetch(`/api/returns/${id}`, { method: 'PATCH' });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) setError((data.error as string) ?? '취소하지 못했어요');
        else router.refresh();
    };

    if (requests.length === 0 && !canRequest) return null;
    return (
        <section className="my-card rt-status">
            <h2 className="my-card__title">교환·반품</h2>
            {justSent ? <p className="rt-ok">신청이 접수됐어요. 확인 후 회수 일정을 안내해 드릴게요.</p> : null}
            {requests.map((r) => (
                <div key={r.id} className="rt-req">
                    <div className="rt-req__head">
                        <b>
                            {RETURN_TYPE_LABEL[r.type].split(' ')[0]} · {RETURN_REASON_LABEL[r.reason]}
                        </b>
                        <span className={`rt-badge rt-badge--${r.status}`}>{RETURN_STATUS_LABEL[r.status]}</span>
                    </div>
                    <p>
                        {day(r.createdAt)} 신청 · {r.items.map((i) => `${i.name} ${i.qty}개`).join(', ')}
                    </p>
                    {r.type === 'refund' ? (
                        <p>
                            {r.status === 'completed' && r.refundAmount !== null
                                ? `환불 ${won(r.refundAmount)}`
                                : `예상 환불 ${won(r.refundEstimate)}${r.returnFee > 0 ? ` (반품 배송비 ${won(r.returnFee)} 차감)` : ''}`}
                        </p>
                    ) : null}
                    {r.status === 'approved' ? <p>택배 기사님이 회수하러 방문할 예정이에요. 받으신 상자에 다시 포장해 두세요.</p> : null}
                    {r.adminNote && r.status !== 'rejected' ? <p>안내: {r.adminNote}</p> : null}
                    {r.status === 'rejected' && r.rejectReason ? <p className="my-error">반려 사유: {r.rejectReason}</p> : null}
                    {r.status === 'requested' ? (
                        <button type="button" className="my-btn addr-btn addr-btn--ghost" disabled={busy} onClick={() => withdraw(r.id)}>
                            신청 취소
                        </button>
                    ) : null}
                </div>
            ))}
            {error ? <p className="my-error">{error}</p> : null}
            {canRequest ? (
                <>
                    <Link href={`/mypage/orders/${orderNo}/return`} className="my-btn my-btn--primary rt-start">
                        교환·반품 신청
                    </Link>
                    {deadlines ? <p className="rt-deadline">{deadlines}</p> : null}
                </>
            ) : null}
        </section>
    );
}
