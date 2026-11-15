'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { consentGiftText, type ConsentResult } from './consentResult';

/**
 * "알림 켜고 쿠폰 받기": turns the event/benefit notifications on, which issues the waiting coupons (and raises the
 * sign-up coupon). The member can turn it off any time in 내 정보; coupons already issued stay.
 */
export function ConsentUnlock({ heading, gainText }: { heading: string; gainText: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<string | null>(null);
    const [error, setError] = useState('');

    const turnOn = async () => {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/account/marketing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agreed: true }),
            });
            if (!res.ok) throw new Error();
            const data = (await res.json().catch(() => ({}))) as ConsentResult;
            setDone(consentGiftText(data) || gainText);
            router.refresh();
        } catch {
            setError('켜지 못했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <div className="co-consent is-on">
                <div className="co-consent__text">
                    <strong>🎉 {done}을 받았어요</strong>
                    <span>이벤트·혜택 알림을 켰어요. 쿠폰함에서 바로 쓸 수 있어요.</span>
                </div>
            </div>
        );
    }
    return (
        <div className="co-consent">
            <div className="co-consent__row">
                <div className="co-consent__text">
                    <strong>🔔 {heading}</strong>
                    <span>
                        이벤트·혜택 알림을 켜면 <b>{gainText}</b>을 바로 받아요
                    </span>
                </div>
                <button type="button" className="my-inv__btn" onClick={turnOn} disabled={busy}>
                    {busy ? '켜는 중...' : '알림 켜고 받기'}
                </button>
            </div>
            {error ? <p className="my-error">{error}</p> : null}
            <p className="co-consent__fine">
                (선택) 쿠폰 만료, 새 맛 출시, 회원 전용 할인 소식을 이메일·카카오톡·문자로 보내 드려요. 주문·결제·배송 안내는 알림 설정과 상관없이 보내 드려요.
                마이페이지 &gt; 내 정보에서 언제든 끌 수 있고, 이미 받은 쿠폰은 알림을 꺼도 그대로 쓸 수 있어요.
            </p>
        </div>
    );
}
