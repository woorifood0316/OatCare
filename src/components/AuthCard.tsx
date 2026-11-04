'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { safeCallbackPath } from '../lib/safe-redirect';
import { getAssetUrl } from '../utils/assets';
import { preloadKakaoSdk, startKakaoLogin } from '../lib/kakao-sdk';
import { inAppKind, isMobile, rememberedInApp, type InAppKind } from '../lib/app-switch';


type Mode = 'login' | 'signup';
type Provider = 'kakao' | 'naver' | 'google';

const PROVIDER_LABEL: Record<Provider, string> = {
    kakao: '카카오',
    naver: '네이버',
    google: '구글',
};

const ERROR_MESSAGES: Record<string, string> = {
    AccessDenied: '로그인이 취소되었거나 허용되지 않았어요. 다시 시도해 주세요.',
    Configuration: '로그인 설정에 문제가 있어요. 잠시 후 다시 시도해 주세요.',
    OAuthAccountNotLinked: '이미 다른 방법으로 가입된 계정이에요.',
    KakaoLogin: '카카오 로그인을 마치지 못했어요. 다시 시도해 주세요.',
    SignupExpired: '시간이 지나 가입이 취소됐어요. 버튼을 눌러 다시 시작해 주세요.',
    CredentialsSignin: '가입을 마치지 못했어요. 버튼을 눌러 다시 시작해 주세요.',
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

function AuthCardInner({ mode }: { mode: Mode }) {
    const params = useSearchParams();
    const callbackUrl = safeCallbackPath(params.get('callbackUrl'));
    const [pending, setPending] = useState<Provider | null>(null);
    const [testOpen, setTestOpen] = useState(false);
    const [testId, setTestId] = useState('');
    const [testPw, setTestPw] = useState('');
    const [testError, setTestError] = useState<string | null>(null);
    // Phone browser (QR scanned with the camera): Kakao/Naver are not logged in there, so their pages may ask for an
    // id and password. We only EXPLAIN how to come in through the KakaoTalk / Naver app instead (opening those apps
    // from a web page is blocked or unreliable on many phones).
    const [env, setEnv] = useState<{ inApp: InAppKind; mobile: boolean } | null>(null);
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        preloadKakaoSdk();
        setEnv({ inApp: rememberedInApp() ?? inAppKind(), mobile: isMobile() });
    }, []);
    const copyAddress = async () => {
        try {
            await navigator.clipboard.writeText('chamoatcare.com');
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            /* clipboard blocked: the address is on screen anyway */
        }
    };

    // Sign-up and log-in are one flow now: both pages show the same "…로 시작하기" card.
    void mode;
    const errorCode = params.get('error');
    const notice = params.get('notice');

    let message: { tone: 'error' | 'info'; text: string } | null = null;
    if (notice === 'not-registered') {
        message = { tone: 'info', text: '아직 가입되지 않은 계정이에요. 아래에서 3초 만에 가입해 주세요.' };
    } else if (errorCode) {
        const reason = params.get('reason');
        const base = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default;
        // A short code (e.g. KOE320, state_cookie_missing) so a failed try can be reported and diagnosed.
        message = { tone: 'error', text: reason ? `${base} (오류 코드: ${reason})` : base };
    }

    const handleClick = (provider: Provider) => {
        if (pending) return;
        setPending(provider);
        // A first-time visitor stops at /welcome (one-tap consent) on the way back: remember where to go afterwards.
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `oc_after=${encodeURIComponent(callbackUrl)}; path=/; max-age=1200; SameSite=Lax${secure}`;
        if (provider === 'kakao') {
            // KakaoTalk app "간편로그인" (no id/password). If the SDK cannot start, use the regular web login.
            startKakaoLogin(callbackUrl)
                .then(() => setTimeout(() => setPending(null), 4000)) // the app switch may bring the visitor back to this page
                .catch(() => signIn('kakao', { redirectTo: callbackUrl }));
            return;
        }
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

                <p className="oc-auth__perk">🎟️ 처음 가입하면 <b>3,000원 쿠폰</b>을 바로 드려요 (30일 이내 사용)</p>

                {message && (
                    <p className={`oc-auth__msg oc-auth__msg--${message.tone}`} role="alert">
                        {message.text}
                    </p>
                )}

                <div className="oc-auth__buttons">
                    {(['kakao', 'naver', 'google'] as Provider[]).filter((p) => !(p === 'google' && env?.inApp)).map((p) => (
                        <button
                            key={p}
                            type="button"
                            className={`oc-auth__btn oc-auth__btn--${p}`}
                            onClick={() => handleClick(p)}
                            disabled={pending !== null}
                        >
                            <span className="oc-auth__btn-icon">{ICONS[p]}</span>
                            <span>
                                {pending === p ? '이동 중...' : `${PROVIDER_LABEL[p]}로 시작하기`}
                            </span>
                        </button>
                    ))}
                </div>

                {env?.mobile && env.inApp === null ? (
                    <section className="oc-auth__guide" aria-labelledby="oc-guide-title">
                        <strong id="oc-guide-title">아이디·비밀번호가 기억나지 않으세요?</strong>
                        <p>
                            <b>카카오톡이나 네이버 앱</b>으로 들어오시면 아이디·비밀번호 없이 <b>동의만 누르면</b> 바로 가입돼요.
                        </p>
                        <ol>
                            <li>
                                <span className="oc-auth__guide-app oc-auth__guide-app--kakao">카카오톡</span>
                                카카오톡의 <b>코드 스캔(렌즈)</b>으로 전단지 QR코드를 찍어 주세요.
                            </li>
                            <li>
                                <span className="oc-auth__guide-app oc-auth__guide-app--naver">네이버 앱</span>
                                네이버 앱 검색창의 <b>렌즈(카메라)</b>로 QR코드를 찍어 주세요.
                            </li>
                            <li className="oc-auth__guide-noqr">
                                <span className="oc-auth__guide-app">QR코드가 없으면</span>
                                <span>
                                    <b>카카오톡:</b> 주소를 복사해 <b>나와의 채팅</b>에 보낸 뒤, 보낸 주소를 눌러 주세요.
                                    <button type="button" className="oc-auth__copy" onClick={copyAddress}>
                                        {copied ? '복사했어요 ✓' : '주소 복사'}
                                    </button>
                                </span>
                                <span>
                                    <b>네이버 앱:</b> 검색창에 <b>참오트케어</b>를 검색해 주세요.
                                </span>
                            </li>
                        </ol>
                    </section>
                ) : null}

                {(
                    <>
                        <button type="button" className="oc-auth__btn oc-auth__btn--review" onClick={() => setTestOpen(true)}>
                            <span>테스트 로그인</span>
                        </button>
                        {testOpen ? (
                            <div className="oc-auth__modal" role="dialog" aria-modal="true" onClick={() => setTestOpen(false)}>
                                <form
                                    className="oc-auth__modal-card"
                                    onClick={(e) => e.stopPropagation()}
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        setTestError(null);
                                        const res = await signIn('review', { loginId: testId, password: testPw, redirect: false });
                                        if (res?.error || !res?.ok) setTestError('아이디 또는 비밀번호가 올바르지 않아요.');
                                        else window.location.href = callbackUrl;
                                    }}
                                >
                                    <strong>테스트 로그인</strong>
                                    <input value={testId} onChange={(e) => setTestId(e.target.value)} placeholder="테스트 아이디" autoComplete="off" />
                                    <input type="password" value={testPw} onChange={(e) => setTestPw(e.target.value)} placeholder="테스트 비밀번호" autoComplete="off" />
                                    {testError ? <p className="oc-auth__msg oc-auth__msg--error">{testError}</p> : null}
                                    <div className="oc-auth__modal-actions">
                                        <button type="button" onClick={() => setTestOpen(false)}>닫기</button>
                                        <button type="submit" className="is-primary">로그인</button>
                                    </div>
                                </form>
                            </div>
                        ) : null}
                    </>
                )}

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
                    <a href="/terms" target="_blank" rel="noopener noreferrer">
                        이용약관
                    </a>
                    과{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer">
                        개인정보처리방침
                    </a>
                    에 동의하면 가입돼요. 만 14세 미만은 가입할 수 없어요.
                </p>
                {env?.inApp ? (
                    <p className="oc-auth__inapp">구글 계정은 크롬·사파리 같은 일반 브라우저에서 이용할 수 있어요.</p>
                ) : null}
            </div>
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
