'use client';

import React, { useState } from 'react';
import { loadTossSdk } from '../../lib/toss-sdk';

/** Opens Toss's card registration window (billing authorization). Returns to `next` afterwards. */
export function CardRegistrar({
    next,
    label = '+ 카드 등록',
    className = 'my-link-btn',
}: {
    next: string;
    label?: string;
    className?: string;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const start = async () => {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/billing/prepare', { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((data.error as string) ?? '카드 등록을 시작하지 못했어요');

            await loadTossSdk();
            const clientKey = process.env.NEXT_PUBLIC_TOSS_API_CLIENT_KEY;
            if (!clientKey || !window.TossPayments) throw new Error('결제 모듈을 불러오지 못했어요');

            const payment = window.TossPayments(clientKey).payment({ customerKey: data.customerKey });
            const q = encodeURIComponent(next);
            await payment.requestBillingAuth({
                method: 'CARD',
                successUrl: `${window.location.origin}/billing/success?next=${q}`,
                failUrl: `${window.location.origin}/billing/fail?next=${q}`,
                customerEmail: data.customerEmail ?? undefined,
                customerName: data.customerName ?? undefined,
            });
        } catch (e) {
            const code = (e as { code?: string })?.code;
            if (code !== 'USER_CANCEL') setError((e as Error)?.message || '카드 등록에 실패했어요');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <button type="button" className={className} onClick={start} disabled={busy}>
                {busy ? '여는 중...' : label}
            </button>
            {error ? <span className="my-error">{error}</span> : null}
        </>
    );
}
