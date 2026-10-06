'use client';

import React, { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { safeCallbackPath } from '../lib/safe-redirect';
import { getAssetUrl } from '../utils/assets';

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
    const [marketing, setMarketing] = useState(false);
    const [pending, setPending] = useState<Provider | null>(null);

    const isSignup = mode === 'signup';
    const errorCode = params.get('error');
    const notice = params.get('notice');

    let message: { tone: 'error' | 'info'; text: string } | null = null;
    if (notice === 'not-registered') {
        message = { tone: 'info', text: '아직 가입되지 않은 계정이에요. 아래에서 3초 만에 가입해 주세요.' };
    } else if (errorCode) {
        message = { tone: 'error', text: ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default };
    }

    const handleClick = (provider: Provider) => {
        if (pending) return;
        setPending(provider);
        // Consent is recorded server-side only for sign-ups (short-lived cookie, read once).
        if (isSignup) {
            const secure = window.location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `oc_consent=1; path=/; max-age=600; SameSite=Lax${secure}`;
            document.cookie = `oc_mkt=${marketing ? 1 : 0}; path=/; max-age=600; SameSite=Lax${secure}`;
        }
        signIn(provider, { redirectTo: callbackUrl });
    };

    const verb = isSignup ? '3초 회원가입' : '로 로그인';

    return (
        <main className="oc-auth">
            <div className="oc-auth__card">
                <a href="/" className="oc-auth__brand" aria-label="참오트케어 홈">
                    <img src={getAssetUrl('/assets/oatcare-logo.png')} alt="" />
                    <span>chamoatcare</span>
                </a>

                <h1 className="oc-auth__title">{isSignup ? '3초 만에 시작하세요' : '다시 만나서 반가워요'}</h1>
                <p className="oc-auth__sub">
                    {isSignup
                        ? '쓰던 소셜 계정으로 바로 가입할 수 있어요. 별도 입력은 없어요.'
                        : '가입할 때 사용한 소셜 계정으로 로그인해 주세요.'}
                </p>

                {message && (
                    <p className={`oc-auth__msg oc-auth__msg--${message.tone}`} role="alert">
                        {message.text}
                    </p>
                )}

                <div className="oc-auth__buttons">
                    {(['kakao', 'naver', 'google'] as Provider[]).map((p) => (
                        <button
                            key={p}
                            type="button"
                            className={`oc-auth__btn oc-auth__btn--${p}`}
                            onClick={() => handleClick(p)}
                            disabled={pending !== null}
                        >
                            <span className="oc-auth__btn-icon">{ICONS[p]}</span>
                            <span>
                                {pending === p
                                    ? '이동 중...'
                                    : isSignup
                                      ? `${PROVIDER_LABEL[p]} ${verb}`
                                      : `${PROVIDER_LABEL[p]}${verb}`}
                            </span>
                        </button>
                    ))}
                </div>

                {isSignup && (
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

                {isSignup && (
                    <label className="oc-auth__check">
                        <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
                        <span>(선택) 신제품·혜택 소식 수신에 동의합니다.</span>
                    </label>
                )}

                {isSignup && (
                    <p className="oc-auth__legal">
                        가입 버튼을 누르면{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer">
                            이용약관
                        </a>
                        과{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer">
                            개인정보처리방침
                        </a>
                        에 동의한 것으로 봅니다. 만 14세 미만은 가입할 수 없어요.
                    </p>
                )}

                <p className="oc-auth__switch">
                    {isSignup ? (
                        <>
                            이미 회원이신가요? <a href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>로그인</a>
                        </>
                    ) : (
                        <>
                            아직 회원이 아니신가요?{' '}
                            <a href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}>3초 회원가입</a>
                        </>
                    )}
                </p>
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
