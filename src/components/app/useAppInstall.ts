'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { canPromptInstall, installEnv, isMarkedInstalled, startInstallCapture, subscribeInstall, type InstallEnv } from '../../lib/app-install';
import { WELCOME_COUPON_AMOUNT, WELCOME_COUPON_BASE, WELCOME_COUPON_BONUS } from '../../lib/catalog';

export interface InstallInfo {
    member: boolean;
    /** The member has opened the home-screen app before. */
    installed: boolean;
    /** What opening the app gives: raise the sign-up coupon, or a separate 2,000원 coupon. */
    offer: 'raise' | 'bonus' | null;
    /** The 3,000원 notification coupon was received. */
    consentCoupon?: boolean;
    marketingAgreed?: boolean;
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

// One request per page load, shared by every card on the page.
let infoPromise: Promise<InstallInfo | null> | null = null;
let infoFor = '';

export function resetInstallInfo() {
    infoPromise = null;
}

function loadInfo(who: string): Promise<InstallInfo | null> {
    if (!infoPromise || infoFor !== who) {
        infoFor = who;
        infoPromise = fetch('/api/app/install', { cache: 'no-store' })
            .then((r) => (r.ok ? (r.json() as Promise<InstallInfo>) : null))
            .catch(() => null);
    }
    return infoPromise;
}

/** The benefit line for the install cards ("가입 쿠폰 1,000원 → 3,000원" or "2,000원 쿠폰 1장 더"). */
export function offerText(info: InstallInfo | null): { headline: string; short: string; perk: boolean } {
    // The app benefit was given already (once per member): offer the app for its convenience only.
    if (info?.installed) return { headline: '앱으로 설치하면 아이콘 한 번으로 바로 들어와요', short: '아이콘 한 번으로 바로', perk: false };
    if (info?.offer === 'bonus') return { headline: `앱 설치하면 ${won(WELCOME_COUPON_BONUS)} 쿠폰을 1장 더 드려요`, short: `${won(WELCOME_COUPON_BONUS)} 쿠폰`, perk: true };
    return {
        headline: `앱 설치하면 가입 쿠폰이 ${won(WELCOME_COUPON_BASE)} → ${won(WELCOME_COUPON_AMOUNT)}`,
        short: `쿠폰 ${won(WELCOME_COUPON_AMOUNT)}`,
        perk: true,
    };
}

/**
 * Where the visitor is and whether to talk about the app at all. `hidden` is true once the site runs from the
 * home-screen icon, this browser saw it installed, or the member has opened the app before - so people who use the
 * app are never asked to install it.
 */
export function useAppInstall() {
    const { data: session, status } = useSession();
    const [env, setEnv] = useState<InstallEnv | null>(null);
    const [canPrompt, setCanPrompt] = useState(false);
    const [marked, setMarked] = useState(false);
    const [info, setInfo] = useState<InstallInfo | null>(null);
    const [infoReady, setInfoReady] = useState(false);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        startInstallCapture();
        const sync = () => {
            setEnv(installEnv());
            setCanPrompt(canPromptInstall());
            setMarked(isMarkedInstalled());
        };
        sync();
        return subscribeInstall(sync);
    }, []);

    const who = session?.user?.id ?? '';
    useEffect(() => {
        if (status === 'loading') return;
        let alive = true;
        loadInfo(who).then((i) => {
            if (!alive) return;
            setInfo(i);
            setInfoReady(true);
        });
        return () => {
            alive = false;
        };
    }, [status, who, tick]);

    const ready = env !== null && infoReady;
    // Hidden in the app itself, and where this browser saw the app installed - unless the browser now offers to
    // install it again (then it was removed). Having opened the app once (info.installed) only changes the wording.
    const hidden = !ready || env.kind === 'standalone' || (marked && !canPrompt);
    /** Load the steps again (after the member turned the notifications on). */
    const refresh = () => {
        resetInstallInfo();
        setTick((t) => t + 1);
    };
    return { ready, hidden, env, canPrompt, info, member: status === 'authenticated', refresh };
}
