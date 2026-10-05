'use client';

import React, { useState } from 'react';

function formatDate(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function MarketingToggle({ initial, updatedAt }: { initial: boolean; updatedAt: string | null }) {
    const [on, setOn] = useState(initial);
    const [changedAt, setChangedAt] = useState<string | null>(updatedAt);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const toggle = async () => {
        if (busy) return;
        const next = !on;
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/account/marketing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agreed: next }),
            });
            if (!res.ok) throw new Error();
            setOn(next);
            setChangedAt(new Date().toISOString());
        } catch {
            setError('변경하지 못했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="my-row">
            <div className="my-row__text">
                <strong>신제품·혜택 소식 수신</strong>
                <span>
                    {on ? '수신 동의 중' : '수신하지 않음'}
                    {changedAt ? ` · ${formatDate(changedAt)} 변경` : ''}
                </span>
                {error ? <span className="my-error">{error}</span> : null}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label="신제품·혜택 소식 수신"
                className={`my-switch${on ? ' is-on' : ''}`}
                onClick={toggle}
                disabled={busy}
            >
                <span />
            </button>
        </div>
    );
}
