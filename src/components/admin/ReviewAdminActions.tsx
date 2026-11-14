'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VIOLATION_LABEL } from '../../lib/review-filter';

const CATEGORIES = ['profanity', 'privacy', 'ad', 'other'] as const;

/** Delete a review with a category and a written reason. Profanity / personal info / ads count as a violation. */
export function ReviewDeleteButton({ id }: { id: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('profanity');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        if (reason.trim().length < 2) return setError('삭제 사유를 적어 주세요');
        setBusy(true);
        setError('');
        const res = await fetch('/api/admin/reviews/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, category, reason }),
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return setError((data.error as string) ?? '삭제하지 못했어요');
        setOpen(false);
        router.refresh();
    };

    if (!open) {
        return (
            <button type="button" className="adm-btn adm-btn--danger-ghost" onClick={() => setOpen(true)}>
                삭제
            </button>
        );
    }
    return (
        <div className="adm-rv-del">
            <select value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])} aria-label="삭제 유형">
                {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                        {VIOLATION_LABEL[c]}
                        {c === 'other' ? ' (위반 아님)' : ' (위반 1회)'}
                    </option>
                ))}
            </select>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="삭제 사유 (작성자에게도 보여요)" maxLength={300} />
            {error ? <small className="my-error">{error}</small> : null}
            <div className="adm-rv-del__btns">
                <button type="button" className="adm-btn" onClick={() => setOpen(false)} disabled={busy}>
                    취소
                </button>
                <button type="button" className="adm-btn adm-btn--danger" onClick={submit} disabled={busy}>
                    {busy ? '삭제 중' : '삭제'}
                </button>
            </div>
        </div>
    );
}

/** Expel a member who reached the violation limit (account removed, social login blocked from signing up again). */
export function ExpelButton({ userId, name }: { userId: string; name: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const expel = async () => {
        if (!window.confirm(`${name} 회원을 제명할까요?\n정기구독이 해지되고 계정이 삭제되며, 같은 소셜 계정으로 다시 가입할 수 없어요. 주문 기록은 법정 기간 동안 보관돼요.`)) return;
        setBusy(true);
        const res = await fetch('/api/admin/reviews/expel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return window.alert((data.error as string) ?? '제명하지 못했어요');
        router.refresh();
    };
    return (
        <button type="button" className="adm-btn adm-btn--danger" onClick={expel} disabled={busy}>
            {busy ? '처리 중' : '회원 제명'}
        </button>
    );
}
