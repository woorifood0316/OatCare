'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { consentGiftText, type ConsentResult } from './consentResult';

function formatDate(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function MarketingToggle({ initial, updatedAt }: { initial: boolean; updatedAt: string | null }) {
    const [on, setOn] = useState(initial);
    const [changedAt, setChangedAt] = useState<string | null>(updatedAt);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState<{ text: string; gift: boolean } | null>(null);

    const toggle = async () => {
        if (busy) return;
        const next = !on;
        setBusy(true);
        setError('');
        setNotice(null);
        try {
            const res = await fetch('/api/account/marketing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agreed: next }),
            });
            if (!res.ok) throw new Error();
            const data = (await res.json().catch(() => ({}))) as ConsentResult;
            setOn(next);
            setChangedAt(new Date().toISOString());
            const gift = next ? consentGiftText(data) : '';
            setNotice(
                gift
                    ? { text: `🎉 ${gift}을 받았어요. 쿠폰함에서 바로 쓸 수 있어요.`, gift: true }
                    : next
                      ? { text: '알림 받기를 켰어요.', gift: false }
                      : { text: '알림 받기를 껐어요. 이미 받은 쿠폰은 그대로 쓸 수 있어요.', gift: false },
            );
        } catch {
            setError('변경하지 못했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="my-row">
            <div className="my-row__text">
                <strong>이벤트·혜택 알림 (광고)</strong>
                <span>
                    {on ? '받는 중 · 쿠폰 만료·새 맛·할인 소식 (앱 알림·이메일·카카오)' : '받지 않음 · 주문·배송 안내는 그대로 가요'}
                    {changedAt ? ` · ${formatDate(changedAt)} 변경` : ''}
                </span>
                {error ? <span className="my-error">{error}</span> : null}
                {notice ? (
                    <span className={`my-consent-notice${notice.gift ? ' is-gift' : ''}`} role="status">
                        {notice.text}
                        {notice.gift ? (
                            <>
                                {' '}
                                <Link href="/mypage/coupons">쿠폰함 보기 →</Link>
                            </>
                        ) : null}
                    </span>
                ) : null}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label="이벤트·혜택 알림"
                className={`my-switch${on ? ' is-on' : ''}`}
                onClick={toggle}
                disabled={busy}
            >
                <span />
            </button>
        </div>
    );
}
