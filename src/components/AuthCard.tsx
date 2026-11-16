'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { LegalModal, type LegalModalType } from './LegalModal';
import { useSearchParams } from 'next/navigation';
import { safeCallbackPath } from '../lib/safe-redirect';
import { currentRefCode } from './share/RefCapture';
import { getAssetUrl } from '../utils/assets';
import { SIGNUP_COUPON_MAX } from '../lib/catalog';
import { preloadKakaoSdk, startKakaoLogin } from '../lib/kakao-sdk';
import { CART_PARAM, encodeCart, inAppKind, isAndroid, isAndroidChrome, isMobile, isStandalone, openInAppHref, rememberedInApp, type InAppKind } from '../lib/app-switch';


type Mode = 'login' | 'signup';
type Provider = 'kakao' | 'naver' | 'google';

const PROVIDER_LABEL: Record<Provider, string> = {
    kakao: '카카오',
    naver: '네이버',
    google: '구글',
};

const PROVIDER_LABEL_EXISTS: Record<string, string> = { kakao: '카카오', naver: '네이버', google: '구글' };

const ERROR_MESSAGES: Record<string, string> = {
    AccessDenied: '로그인이 취소되었거나 허용되지 않았어요. 다시 시도해 주세요.',
    Configuration: '로그인 설정에 문제가 있어요. 잠시 후 다시 시도해 주세요.',
    OAuthAccountNotLinked: '이미 다른 방법으로 가입된 계정이에요.',
    KakaoLogin: '카카오 로그인을 마치지 못했어요. 다시 시도해 주세요.',
    SignupExpired: '시간이 지나 가입이 취소됐어요. 버튼을 눌러 다시 시작해 주세요.',
    CredentialsSignin: '가입을 마치지 못했어요. 버튼을 눌러 다시 시작해 주세요.',
    banned: '리뷰 운영정책 위반으로 제명된 계정이라 다시 가입할 수 없어요. 문의: 고객센터 031-998-7234',
    Default: '로그인 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
};

const KakaoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
            fill="#191919"
            d="M12 3C6.48 3 2 6.58 2 10.99c0 2.84 1.87 5.33 4.69 6.75-.2.74-.74 2.68-.85 3.1-.13.52.19.51.4.37.17-.11 2.65-1.8 3.72-2.53.65.09 1.32.14 2.04.14 5.52 0 10-3.58 10-7.99S17.52 3 12 3z"
        />
    </svg>
);

const NaverIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#fff" d="M16.27 12.84 7.38 0H0v24h7.73V11.16L16.62 24H24V0h-7.73z" />
    </svg>
);

const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
);

const ICONS: Record<Provider, React.ReactNode> = {
    kakao: <KakaoIcon />,
    naver: <NaverIcon />,
    google: <GoogleIcon />,
};

const HANDOFF_KEY = 'oc_handoff';
const TRIED_KEY = 'oc_tried';
/** Remember that Naver/Google login was started from this tab (null = clear). */
function markTried(provider: Provider | null) {
    try {
        if (provider === 'naver' || provider === 'google') sessionStorage.setItem(TRIED_KEY, provider);
        else sessionStorage.removeItem(TRIED_KEY);
    } catch {
        /* ignore */
    }
}

function AuthCardInner({ mode }: { mode: Mode }) {
    const params = useSearchParams();
    const callbackUrl = safeCallbackPath(params.get('callbackUrl'));
    const [pending, setPending] = useState<Provider | null>(null);
    // 이용약관 / 개인정보처리방침 open over the page, so closing them leaves the visitor right here
    const [legal, setLegal] = useState<LegalModalType>(null);
    // Where the page runs decides how each button signs in without an id/password:
    //  - 카카오: KakaoTalk "간편로그인" (the app opens for consent only), from any browser.
    //  - 네이버: in a normal phone browser, hand this page over to the Naver app (logged in there), then start Naver login.
    //  - 구글: on Android outside Chrome, hand over to Chrome (it picks the phone's Google account), then start Google login.
    // The guest cart rides along in the URL. If the app isn't there (oc_noapp=…), that button falls back to the web login.
    const [env, setEnv] = useState<{ inApp: InAppKind; mobile: boolean; android: boolean; chrome: boolean; standalone: boolean } | null>(null);
    const [noApp, setNoApp] = useState<Provider[]>([]);
    // Came here through our hand-off (Naver app / Chrome): only Kakao and that provider are offered (no further hops).
    const [handoff, setHandoff] = useState<'naver' | 'google' | null>(null);
    // Started Naver/Google login and came back without finishing (it asked for an id/password): point to Kakao.
    const [cameBack, setCameBack] = useState<'naver' | 'google' | null>(null);
    // Leaving for the Naver app / Chrome right now (the phone may ask "open?").
    const [leaving, setLeaving] = useState<'naver' | 'google' | null>(null);
    useEffect(() => {
        preloadKakaoSdk();
        setEnv({ inApp: rememberedInApp() ?? inAppKind(), mobile: isMobile(), android: isAndroid(), chrome: isAndroidChrome(), standalone: isStandalone() });
        const url = new URL(window.location.href);
        const missing = url.searchParams.get('oc_noapp');
        const start = url.searchParams.get('oc_start');
        if (missing === 'naver') setNoApp(['naver']);
        if (missing === 'chrome') setNoApp(['google']);
        if (missing || start) {
            url.searchParams.delete('oc_noapp');
            url.searchParams.delete('oc_start');
            window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
        }
        try {
            if (start === 'naver' || start === 'google') sessionStorage.setItem(HANDOFF_KEY, start);
            const h = sessionStorage.getItem(HANDOFF_KEY);
            if (h === 'naver' || h === 'google') setHandoff(h);
        } catch {
            /* ignore */
        }
        // Back from the provider's page without finishing (back button / back-forward cache).
        const checkReturn = () => {
            setPending(null);
            setLeaving(null);
            try {
                const tried = sessionStorage.getItem(TRIED_KEY);
                if (tried === 'naver' || tried === 'google') setCameBack(tried);
            } catch {
                /* ignore */
            }
        };
        if (!start) checkReturn();
        const onShow = (e: PageTransitionEvent) => {
            if (e.persisted) checkReturn();
        };
        window.addEventListener('pageshow', onShow);
        // Switched back to this browser from the Naver app / Chrome (app switcher, not the back button).
        let wasHidden = false;
        const onVisible = () => {
            if (document.visibilityState === 'hidden') wasHidden = true;
            else if (wasHidden) {
                wasHidden = false;
                checkReturn();
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        // Arrived in the Naver app / Chrome from our own button: go straight on to that login.
        if (start === 'naver' || start === 'google') {
            markTried(start);
            setPending(start);
            // A moment first, so the cart that came along in the URL is saved in this app's browser.
            const back = safeCallbackPath(url.searchParams.get('callbackUrl'));
            window.setTimeout(() => signIn(start, { redirectTo: back }), 400);
        }
        return () => {
            window.removeEventListener('pageshow', onShow);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    // Sign-up and log-in are one flow now: both pages show the same "…로 시작하기" card.
    void mode;
    const errorCode = params.get('error');
    const notice = params.get('notice');

    let message: { tone: 'error' | 'info'; text: string } | null = null;
    if (notice === 'reauth') {
        const via = PROVIDER_LABEL_EXISTS[params.get('via') ?? ''];
        message = { tone: 'info', text: `본인 확인을 위해 ${via ? `[${via}] 버튼으로 ` : ''}다시 로그인해 주세요. 로그인하면 바로 내 정보를 수정할 수 있어요.` };
    } else if (notice === 'not-registered') {
        message = { tone: 'info', text: '아직 가입되지 않은 계정이에요. 아래에서 3초 만에 가입해 주세요.' };
    } else if (errorCode === 'exists') {
        const via = PROVIDER_LABEL_EXISTS[params.get('via') ?? ''];
        message = {
            tone: 'info',
            text: via ? `이미 ${via}로 가입된 회원이에요. 아래 [${via}] 버튼으로 로그인해 주세요.` : '이미 다른 방법으로 가입된 회원이에요. 처음 가입한 방법으로 로그인해 주세요.',
        };
    } else if (errorCode) {
        const reason = params.get('reason');
        const base = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default;
        // A short code (e.g. KOE320, state_cookie_missing) so a failed try can be reported and diagnosed.
        message = { tone: 'error', text: reason ? `${base} (오류 코드: ${reason})` : base };
    }

    // Titles say where the visitor will end up (the phone may ask which app to open: they pick that one).
    const toNaverApp = Boolean(env?.mobile && !env.standalone && env.inApp === null);
    const toChrome = Boolean(env?.mobile && !env.standalone && env.inApp === null && env.android && !env.chrome);
    const buttonTitle = (p: Provider): string => {
        if (p === 'kakao') return '카카오로 3초 만에 시작하기';
        if (p === 'naver') return toNaverApp ? '네이버 앱으로 시작하기' : '네이버로 시작하기';
        return toChrome ? '구글 크롬브라우저로 시작하기' : '구글로 시작하기';
    };

    const handleClick = (provider: Provider) => {
        if (pending) return;
        setPending(provider);
        // A first-time visitor stops at /welcome (one-tap consent) on the way back: remember where to go afterwards.
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `oc_after=${encodeURIComponent(callbackUrl)}; path=/; max-age=1200; SameSite=Lax${secure}`;
        if (provider === 'kakao') {
            markTried(null);
            setCameBack(null);
            // KakaoTalk app "간편로그인" (no id/password). If the SDK cannot start, use the regular web login.
            startKakaoLogin(callbackUrl)
                .then(() => setTimeout(() => setPending(null), 4000)) // the app switch may bring the visitor back to this page
                .catch(() => signIn('kakao', { redirectTo: callbackUrl }));
            return;
        }
        const handOff =
            env?.mobile &&
            !env.standalone &&
            env.inApp === null &&
            !noApp.includes(provider) &&
            (provider === 'naver' || (provider === 'google' && env.android && !env.chrome));
        if (handOff) {
            const target = provider === 'naver' ? 'naver' : 'chrome';
            const url = new URL(window.location.href);
            url.searchParams.set('oc_start', provider);
            const ref = currentRefCode();
            if (ref) url.searchParams.set('ref', ref);
            try {
                const raw = window.localStorage.getItem('oc_cart_v1');
                const lines = raw ? (JSON.parse(raw) as unknown[]) : [];
                if (Array.isArray(lines) && lines.length > 0) url.searchParams.set(CART_PARAM, encodeCart(lines));
            } catch {
                /* no cart */
            }
            const href = openInAppHref(target, url.toString());
            if (href) {
                markTried(provider);
                setLeaving(provider);
                // App not installed / blocked: the page is still in front after a moment, so use the web login next time.
                window.setTimeout(() => {
                    if (document.visibilityState === 'visible') {
                        setPending(null);
                        setLeaving(null);
                        setNoApp((list) => [...list, provider]);
                    }
                }, 2500);
                window.location.href = href;
                return;
            }
        }
        markTried(provider);
        signIn(provider, { redirectTo: callbackUrl });
    };


    return (
        <main className="oc-auth">
            <div className="oc-auth__card">
                <a href="/" className="oc-auth__brand" aria-label="참오트케어 홈">
                    <img src={getAssetUrl('/assets/oatcare-logo.png')} alt="" />
                    <span>참오트케어</span>
                </a>

                <h1 className="oc-auth__title">참오트케어 시작하기</h1>
                <p className="oc-auth__sub">
                    쓰시는 카카오·네이버 계정으로 바로 시작해요.
                    <br />
                    처음이시면 동의 한 번으로 가입까지 끝나요.
                </p>

                <p className="oc-auth__perk">🎟️ 처음 가입하면 <b>쿠폰 혜택 최대 {SIGNUP_COUPON_MAX.toLocaleString('ko-KR')}원</b> (가입 · 앱 설치 · 알림 받기)</p>

                {message && (
                    <p className={`oc-auth__msg oc-auth__msg--${message.tone}`} role="alert">
                        {message.text}
                    </p>
                )}

                {cameBack && !leaving ? (
                    <div className="oc-auth__back" role="status">
                        <b>{cameBack === 'naver' ? '네이버' : '구글'} 아이디·비밀번호를 물어봤나요?</b>
                        <span>
                            {cameBack === 'naver' ? '네이버 앱에 로그인돼 있지 않으면 그래요.' : '이 휴대폰에 구글 계정이 없으면 그래요.'} 아래{' '}
                            <b>[카카오로 3초 만에 시작하기]</b>를 누르면 입력 없이 바로 가입돼요.
                        </span>
                    </div>
                ) : null}

                {noApp.length > 0 ? (
                    <p className="oc-auth__msg oc-auth__msg--info" role="status">
                        {noApp.includes('naver') ? '네이버 앱' : '크롬'}이 열리지 않아 이 화면에서 로그인해요. 버튼을 한 번 더 눌러 주세요.
                    </p>
                ) : null}

                <div className="oc-auth__buttons">
                    {(['kakao', 'naver', 'google'] as Provider[])
                        .filter((p) => !(p === 'google' && env?.inApp))
                        .filter((p) => !handoff || p === 'kakao' || p === handoff)
                        .map((p) => (
                        <button
                            key={p}
                            type="button"
                            className={`oc-auth__btn oc-auth__btn--${p}${cameBack && p === 'kakao' ? ' is-recommended' : ''}`}
                            onClick={() => handleClick(p)}
                            disabled={pending !== null}
                        >
                            <span className="oc-auth__btn-icon">{ICONS[p]}</span>
                            <span>
                                {pending === p ? '이동 중...' : buttonTitle(p)}
                            </span>
                        </button>
                    ))}
                </div>



                {(
                    <div className="oc-auth__collect">
                        <strong>가입 시 받는 정보</strong>
                        <ul>
                            <li>카카오: 닉네임(필수), 이메일(선택)</li>
                            <li>네이버: 이름(필수), 이메일(선택)</li>
                            <li>구글: 이름, 이메일</li>
                        </ul>
                        <p>직접 입력하는 항목은 없어요. 회원 식별과 서비스 안내 목적으로만 쓰고, 탈퇴하면 삭제해요. (주문·결제 기록은 법령에 따라 일정 기간 보관)</p>
                    </div>
                )}

                <p className="oc-auth__legal">
                    처음 오신 분은 다음 화면에서{' '}
                    <a href="/terms" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLegal('terms'); }}>
                        이용약관
                    </a>
                    과{' '}
                    <a href="/privacy" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLegal('privacy'); }}>
                        개인정보처리방침
                    </a>
                    에 동의하면 가입돼요. 만 14세 미만은 가입할 수 없어요.
                </p>
                {env?.inApp ? (
                    <p className="oc-auth__inapp">구글 계정은 크롬·사파리 같은 일반 브라우저에서 이용할 수 있어요.</p>
                ) : null}
            </div>
            <LegalModal type={legal} onClose={() => setLegal(null)} />
        </main>
    );
}

export function AuthCard({ mode }: { mode: Mode }) {
    return (
        <Suspense fallback={null}>
            <AuthCardInner mode={mode} />
        </Suspense>
    );
}
