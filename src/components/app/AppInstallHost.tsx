'use client';

import React, { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { JOINED_KEY, OPEN_INSTALL_EVENT, isMarkedInstalled, isPhone, startInstallCapture } from '../../lib/app-install';
import { isStandalone } from '../../lib/app-switch';
import { CONSENT_COUPON_AMOUNT, COUPON_VALID_DAYS, WELCOME_COUPON_AMOUNT, WELCOME_COUPON_BONUS } from '../../lib/catalog';
import { InstallSheet } from './InstallSheet';
import { resetInstallInfo } from './useAppInstall';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const REWARD_CHECKED = 'oc_app_reward_checked';

type Reward = { given: 'raise' | 'bonus'; consentNext: boolean };

/**
 * Site-wide home-screen app duties (mounted once in Providers):
 *  - registers the service worker and catches the browser's install offer;
 *  - logs the member in from a hand-over link (?oc_handoff=…) after moving from KakaoTalk / Naver app to Chrome / Safari;
 *  - running from the home-screen icon: gives the app benefit once and says so;
 *  - opens the install sheet once right after sign-up, and whenever something asks for it.
 */
export function AppInstallHost() {
    const { status } = useSession();
    const [open, setOpen] = useState<null | 'menu' | 'joined'>(null);
    const [reward, setReward] = useState<Reward | null>(null);

    useEffect(() => {
        startInstallCapture();
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined);
        const onOpen = () => setOpen('menu');
        window.addEventListener(OPEN_INSTALL_EVENT, onOpen);
        return () => window.removeEventListener(OPEN_INSTALL_EVENT, onOpen);
    }, []);

    // Hand-over login: the token works once for 3 minutes; take it off the address either way.
    useEffect(() => {
        if (status === 'loading') return;
        const url = new URL(window.location.href);
        const token = url.searchParams.get('oc_handoff');
        if (!token) return;
        url.searchParams.delete('oc_handoff');
        window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
        if (status === 'authenticated') return;
        signIn('handoff', { token, redirect: false }).then((r) => {
            if (r && !r.error) window.location.reload();
        });
    }, [status]);

    // Opened from the home-screen icon by a member: the app benefit (once per member; the server decides).
    useEffect(() => {
        if (status !== 'authenticated' || !isStandalone()) return;
        try {
            if (sessionStorage.getItem(REWARD_CHECKED)) return;
            sessionStorage.setItem(REWARD_CHECKED, '1');
        } catch {
            /* storage blocked: the server still gives it only once */
        }
        fetch('/api/app/install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ standalone: true }) })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { given: { given: 'raise' | 'bonus' } | null; consentNext?: boolean } | null) => {
                resetInstallInfo();
                if (d?.given) setReward({ given: d.given.given, consentNext: Boolean(d.consentNext) });
            })
            .catch(() => undefined);
    }, [status]);

    // Right after sign-up: offer the app once (phones, not already installed).
    useEffect(() => {
        if (status !== 'authenticated') return;
        try {
            if (sessionStorage.getItem(JOINED_KEY) !== '1') return;
            sessionStorage.removeItem(JOINED_KEY);
        } catch {
            return;
        }
        if (!isPhone() || isStandalone() || isMarkedInstalled()) return;
        const t = setTimeout(() => setOpen('joined'), 700);
        return () => clearTimeout(t);
    }, [status]);

    return (
        <>
            {open ? <InstallSheet joined={open === 'joined'} onClose={() => setOpen(null)} /> : null}
            {reward ? (
                <div className="app-sheet-overlay" role="dialog" aria-modal="true" aria-label="앱 설치 혜택" onClick={() => setReward(null)}>
                    <div className="app-sheet app-reward" onClick={(e) => e.stopPropagation()}>
                        <img src="/icon-192.png" alt="" className="app-sheet__icon" />
                        <h2>🎉 앱 설치 혜택을 받았어요</h2>
                        <p>
                            {reward.given === 'raise' ? (
                                <>
                                    신규 가입 쿠폰이 <b>{won(WELCOME_COUPON_AMOUNT)}</b>으로 올랐어요
                                </>
                            ) : (
                                <>
                                    <b>앱 설치 쿠폰 {won(WELCOME_COUPON_BONUS)}</b>을 받았어요
                                </>
                            )}
                        </p>
                        {reward.consentNext ? (
                            <p className="app-reward__next">
                                🔔 이벤트·혜택 알림까지 켜면 <b>{won(CONSENT_COUPON_AMOUNT)} 쿠폰</b>을 1장 더 드려요
                            </p>
                        ) : null}
                        <p className="app-sheet__fine">쿠폰은 한 번 주문에 1장씩 쓰고, 받은 날부터 {COUPON_VALID_DAYS}일 안에 쓰면 돼요.</p>
                        <div className="app-reward__actions">
                            <a href="/mypage/coupons" className="app-sheet__main">
                                쿠폰함 보기
                            </a>
                            <button type="button" className="app-sheet__later" onClick={() => setReward(null)}>
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
