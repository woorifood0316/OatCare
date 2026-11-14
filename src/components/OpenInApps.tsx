'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { WELCOME_COUPON_AMOUNT } from '../lib/catalog';
import { CART_PARAM, encodeCart, inAppKind, isAndroid, isAndroidChrome, isMobile, isStandalone, openInAppHref, rememberedInApp, type OpenTarget } from '../lib/app-switch';

const LABEL: Record<OpenTarget, string> = {
    kakao: '카카오톡으로 열기',
    naver: '네이버 앱으로 열기',
    chrome: '크롬으로 열기',
};
const SUB: Record<OpenTarget, string> = {
    kakao: '카카오 계정으로 바로 가입',
    naver: '네이버 계정으로 바로 가입',
    chrome: '구글 계정 선택만으로 가입',
};
/** With the subject particle: 카카오톡이 / 네이버 앱이 / 크롬이. */
const NAME: Record<OpenTarget, string> = { kakao: '카카오톡이', naver: '네이버 앱이', chrome: '크롬이' };

/** The current page's URL, with the guest cart riding along (each app's browser starts with empty storage). */
function currentUrlWithCart(): string {
    const url = new URL(window.location.href);
    url.searchParams.delete('oc_noapp');
    url.searchParams.delete('oc_pick');
    try {
        const raw = window.localStorage.getItem('oc_cart_v1');
        const lines = raw ? (JSON.parse(raw) as unknown[]) : [];
        if (Array.isArray(lines) && lines.length > 0) url.searchParams.set(CART_PARAM, encodeCart(lines));
    } catch {
        /* no cart */
    }
    return url.toString();
}

/** Which "open in …" buttons make sense on this phone/browser, or null when none should be shown. */
function useTargets(): OpenTarget[] | null {
    const [targets, setTargets] = useState<OpenTarget[] | null>(null);
    useEffect(() => {
        if (!isMobile() || isStandalone()) return setTargets(null);
        const inApp = rememberedInApp() ?? inAppKind();
        if (inApp === 'kakao' || inApp === 'naver') return setTargets(null); // already where login is one tap
        const list: OpenTarget[] = ['kakao', 'naver'];
        // Google sign-in is blocked inside other apps' browsers; Chrome (Android) lets the visitor pick a phone account.
        if (isAndroid() && !isAndroidChrome()) list.push('chrome');
        setTargets(list);
    }, []);
    return targets;
}

function Buttons({ targets, onNote }: { targets: OpenTarget[]; onNote: (msg: string) => void }) {
    const open = (t: OpenTarget) => {
        const href = openInAppHref(t, currentUrlWithCart());
        if (!href) return;
        // If the app didn't open (not installed / blocked), the page is still in front after a moment.
        const timer = window.setTimeout(() => {
            if (document.visibilityState === 'visible') onNote(`${NAME[t]} 열리지 않았어요. 앱이 설치돼 있는지 확인하거나, 아래 다른 방법을 이용해 주세요.`);
        }, 2200);
        const cancel = () => {
            if (document.visibilityState === 'hidden') window.clearTimeout(timer);
        };
        document.addEventListener('visibilitychange', cancel, { once: true });
        window.location.href = href;
    };
    return (
        <div className="oia-btns">
            {targets.map((t) => (
                <button key={t} type="button" className={`oia-btn oia-btn--${t}`} onClick={() => open(t)}>
                    <b>{LABEL[t]}</b>
                    <small>{SUB[t]}</small>
                </button>
            ))}
        </div>
    );
}

function useNoAppNote(): [string, (m: string) => void] {
    const [note, setNote] = useState('');
    useEffect(() => {
        // Android sends the visitor back here with oc_noapp=<target> when that app isn't installed.
        const url = new URL(window.location.href);
        const t = url.searchParams.get('oc_noapp') as OpenTarget | null;
        if (t && t in NAME) {
            setNote(`${NAME[t]} 설치돼 있지 않거나 열 수 없어요. 다른 방법을 골라 주세요.`);
            url.searchParams.delete('oc_noapp');
            window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
        }
    }, []);
    return [note, setNote];
}

/** Box on the login page: open this page inside KakaoTalk / Naver / Chrome, where sign-in needs no id or password. */
export function OpenInAppsBox({ compact = false }: { compact?: boolean }) {
    const targets = useTargets();
    const [note, setNote] = useNoAppNote();
    if (!targets) return null;
    return (
        <div className={`oia-box${compact ? ' oia-box--compact' : ''}`}>
            <p className="oia-box__title">{compact ? '아이디·비밀번호를 물어보나요?' : '아이디·비밀번호 입력 없이 가입하려면'}</p>
            <p className="oia-box__sub">쓰시는 앱으로 열면 로그인돼 있는 계정으로 동의만 누르면 끝나요.</p>
            <Buttons targets={targets} onNote={setNote} />
            {note ? <p className="oia-note">{note}</p> : null}
        </div>
    );
}

const QR_SOURCES = /^(flyer|qr|poster|print)$/i;
const SEEN_KEY = 'oc_oia_seen';

/**
 * Bottom sheet for visitors who came from a printed QR code (utm_source=flyer …) in the phone's normal browser:
 * "카카오톡으로 열기 / 네이버 앱으로 열기 / 크롬으로 열기". Shown once per visit, never to members already signed in.
 */
export function QrOpenSheet() {
    const { status } = useSession();
    const targets = useTargets();
    const [note, setNote] = useNoAppNote();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!targets || status !== 'unauthenticated') return;
        const p = new URLSearchParams(window.location.search);
        const fromQr = QR_SOURCES.test(p.get('utm_source') ?? '') || p.get('utm_medium') === 'print' || p.get('oc_pick') === '1';
        let seen = false;
        try {
            seen = sessionStorage.getItem(SEEN_KEY) === '1';
        } catch {
            /* ignore */
        }
        if (p.get('oc_opened')) seen = true; // arrived here from our own "크롬으로 열기"
        if (fromQr && !seen) setShow(true);
    }, [targets, status]);

    const close = () => {
        setShow(false);
        try {
            sessionStorage.setItem(SEEN_KEY, '1');
        } catch {
            /* ignore */
        }
    };

    if (!show || !targets) return null;
    return (
        <div className="oia-sheet" role="dialog" aria-modal="true" aria-labelledby="oia-sheet-title" onClick={close}>
            <section className="oia-sheet__card" onClick={(e) => e.stopPropagation()}>
                <img src="/assets/oatcare-logo.png" alt="" className="oia-sheet__logo" />
                <h2 id="oia-sheet-title">참오트케어, 3초 만에 시작하기</h2>
                <p>
                    쓰시는 앱으로 열면 <b>아이디·비밀번호 없이</b> 동의만 눌러 가입돼요.
                    <br />
                    지금 가입하면 <b>{WELCOME_COUPON_AMOUNT.toLocaleString('ko-KR')}원 쿠폰</b>도 드려요.
                </p>
                <Buttons targets={targets} onNote={setNote} />
                {note ? <p className="oia-note">{note}</p> : null}
                <button type="button" className="oia-sheet__skip" onClick={close}>
                    이 화면에서 그냥 둘러볼게요 ›
                </button>
            </section>
        </div>
    );
}
