'use client';

import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { disablePush, enablePush, prefetchPushKey, pushState, type PushState } from '../../lib/push-client';
import { openInstallSheet } from '../../lib/app-install';
import { consentGiftText } from '../mypage/consentResult';

type Member = { member: boolean; marketingAgreed?: boolean };

/**
 * "배송 출발하면 앱 알림으로 알려 드릴까요?" - asks for order / delivery app notifications at the moments people want
 * them (order complete, subscription start, first app visit). The optional event/benefit consent is a separate box.
 * Hidden when notifications are already on, unsupported, or for visitors who are not logged in.
 */
export function PushOptIn({ heading, sub }: { heading: string; sub?: string }) {
    const [state, setState] = useState<PushState | null>(null);
    const [me, setMe] = useState<Member | null>(null);
    const [marketing, setMarketing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        pushState().then(setState);
        void prefetchPushKey();
        fetch('/api/app/install', { cache: 'no-store' })
            .then((r) => (r.ok ? (r.json() as Promise<Member>) : null))
            .then((m) => setMe(m))
            .catch(() => setMe(null));
    }, []);

    if (done) {
        return (
            <div className="push-card is-done" role="status">
                <BellRing size={20} aria-hidden="true" />
                <div>
                    <strong>앱 알림을 켰어요</strong>
                    <span>{done}</span>
                </div>
            </div>
        );
    }
    if (!state || !me?.member || state === 'on' || state === 'unsupported') return null;

    if (state === 'needs-app') {
        return (
            <div className="push-card">
                <BellRing size={20} aria-hidden="true" />
                <div>
                    <strong>{heading}</strong>
                    <span>아이폰은 홈 화면에 추가한 참오트케어 앱에서 알림을 받을 수 있어요.</span>
                </div>
                <button type="button" className="push-card__btn" onClick={openInstallSheet}>
                    앱 설치하기
                </button>
            </div>
        );
    }
    if (state === 'denied') {
        return (
            <div className="push-card is-muted">
                <BellRing size={20} aria-hidden="true" />
                <div>
                    <strong>알림이 꺼져 있어요</strong>
                    <span>휴대폰 설정 → 알림에서 참오트케어(또는 이 브라우저) 알림을 허용하면 배송 소식을 받을 수 있어요.</span>
                </div>
            </div>
        );
    }

    const turnOn = async () => {
        if (busy) return;
        setBusy(true);
        setError('');
        const r = await enablePush(marketing);
        setBusy(false);
        if (r.ok) {
            const gift = consentGiftText(r);
            setDone(gift ? `🎉 ${gift}도 받았어요. 주문·배송 소식을 앱 알림으로 보내 드릴게요.` : '주문·배송 소식을 앱 알림으로 보내 드릴게요.');
        } else if (r.reason === 'denied') {
            setState('denied');
        } else {
            setError('알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요.');
        }
    };

    return (
        <div className="push-card">
            <BellRing size={20} aria-hidden="true" />
            <div>
                <strong>{heading}</strong>
                <span>{sub ?? '결제 완료, 배송 출발, 정기결제 예정을 앱 알림으로 바로 알려 드려요.'}</span>
                {me.marketingAgreed ? null : (
                    <label className="push-card__opt">
                        <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
                        <span>
                            (선택) 이벤트·혜택 소식도 받을게요 → <b>알림 받기 쿠폰 3,000원</b>
                            <small>쿠폰 만료·새 맛·회원 전용 할인 소식을 앱 알림·이메일·카카오톡·문자로 보내요. 언제든 끌 수 있어요.</small>
                        </span>
                    </label>
                )}
                {error ? <span className="my-error">{error}</span> : null}
            </div>
            <button type="button" className="push-card__btn" onClick={turnOn} disabled={busy}>
                {busy ? '켜는 중...' : '알림 받기'}
            </button>
        </div>
    );
}

/** 내 정보 › 알림 설정: order / delivery app notifications on this device. */
export function PushToggle() {
    const [state, setState] = useState<PushState | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        pushState().then(setState);
        void prefetchPushKey(); // ready before the first tap
    }, []);
    if (!state || state === 'unsupported') return null;

    const on = state === 'on';
    // The switch moves at once; registering with the phone's push service (1-3 s) happens behind it and the switch
    // goes back, with a note, only if that fails.
    const toggle = async () => {
        if (busy) return;
        setBusy(true);
        setError('');
        if (on) {
            setState('off');
            await disablePush();
        } else {
            setState('on');
            const r = await enablePush(false);
            if (!r.ok) {
                setState(r.reason === 'denied' ? 'denied' : 'off');
                if (r.reason !== 'denied') setError('알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요.');
            }
        }
        setBusy(false);
    };

    return (
        <div className="my-row">
            <div className="my-row__text">
                <strong>주문·배송 앱 알림</strong>
                <span>
                    {state === 'needs-app' ? (
                        <>
                            아이폰은 홈 화면 앱에서 켤 수 있어요 ·{' '}
                            <button type="button" className="push-link" onClick={openInstallSheet}>
                                앱 설치하기
                            </button>
                        </>
                    ) : state === 'denied' ? (
                        '휴대폰 설정에서 이 앱(또는 브라우저)의 알림을 허용해 주세요'
                    ) : on ? (
                        '이 기기에서 받는 중 · 결제·배송·정기결제 안내'
                    ) : (
                        '결제·배송·정기결제 안내를 앱 알림으로 받아요'
                    )}
                </span>
                {error ? <span className="my-error">{error}</span> : null}
            </div>
            {state === 'needs-app' || state === 'denied' ? null : (
                <button type="button" role="switch" aria-checked={on} aria-label="주문·배송 앱 알림" className={`my-switch${on ? ' is-on' : ''}`} onClick={toggle} aria-busy={busy}>
                    <span />
                </button>
            )}
        </div>
    );
}

