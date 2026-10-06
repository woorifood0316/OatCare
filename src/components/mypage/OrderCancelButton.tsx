'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export function OrderCancelButton({ orderNo }: { orderNo: string }) {
    const router = useRouter();
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const cancel = async () => {
        setBusy(true);
        setError('');
        const res = await fetch(`/api/orders/${orderNo}/cancel`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setError((data.error as string) ?? '취소하지 못했어요');
            setBusy(false);
            return;
        }
        router.refresh();
    };

    return (
        <section className="my-card my-card--danger">
            {!confirming ? (
                <button type="button" className="my-withdraw-link" onClick={() => setConfirming(true)}>
                    주문 취소하기
                </button>
            ) : (
                <div className="my-confirm">
                    <p>주문을 취소하면 결제 금액 전액이 환불돼요. 계속할까요?</p>
                    {error ? <p className="my-error">{error}</p> : null}
                    <div className="my-confirm-actions">
                        <button type="button" className="my-btn addr-btn addr-btn--ghost" onClick={() => setConfirming(false)} disabled={busy}>
                            닫기
                        </button>
                        <button type="button" className="my-btn my-btn--primary" onClick={cancel} disabled={busy}>
                            {busy ? '처리 중...' : '주문 취소'}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
