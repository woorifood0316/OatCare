'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { getAssetUrl } from '../utils/assets';
import { CONSENT_COUPON_AMOUNT, SIGNUP_COUPON_MAX, WELCOME_COUPON_AMOUNT, WELCOME_COUPON_BASE } from '../lib/catalog';
import { JOINED_KEY } from '../lib/app-install';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** First visit with a social account: one required consent (+ optional marketing), then the member is created. */
export function WelcomeConsent({ name, provider, next }: { name: string | null; provider: string; next: string }) {
    const [agreed, setAgreed] = useState(false);
    const [marketing, setMarketing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const start = async () => {
        if (busy) return;
        if (!agreed) {
            setError('필수 항목에 동의해 주세요.');
            return;
        }
        setBusy(true);
        setError('');
        const res = await signIn('signup', { agreed: '1', marketing: marketing ? '1' : '0', redirect: false });
        if (!res || res.error) {
            setError('가입을 마치지 못했어요. 처음 화면에서 다시 시작해 주세요.');
            setBusy(false);
            return;
        }
        document.cookie = 'oc_after=; path=/; max-age=0';
        try {
            sessionStorage.setItem(JOINED_KEY, '1'); // the next page offers the home-screen app once
        } catch {
            /* storage blocked */
        }
        window.location.href = next;
    };

    return (
        <main className="oc-auth">
            <div className="oc-auth__card oc-welcome">
                <a href="/" className="oc-auth__brand" aria-label="참오트케어 홈">
                    <img src={getAssetUrl('/assets/oatcare-logo.png')} alt="" />
                    <span>참오트케어</span>
                </a>

                <h1 className="oc-auth__title">
                    {name ? (
                        <>
                            {name}님,
                            <br />
                            환영해요!
                        </>
                    ) : (
                        '환영해요!'
                    )}
                </h1>
                <p className="oc-auth__sub">{provider} 계정으로 처음 오셨어요. 아래에 동의하시면 가입이 끝나요.</p>
                <p className="oc-auth__perk">
                    {/* one step per line, so nothing wraps in the middle of a step */}
                    <span className="oc-welcome__step">
                        🎟️ 가입하면 <b>{won(WELCOME_COUPON_BASE)} 쿠폰</b>
                    </span>
                    <span className="oc-welcome__step">
                        📲 앱 설치하면 <b>{won(WELCOME_COUPON_AMOUNT)}</b>으로 업그레이드
                    </span>
                    <span className="oc-welcome__step">
                        🔔 알림까지 받으면 <b>{won(CONSENT_COUPON_AMOUNT)} 쿠폰 1장 더</b>
                    </span>
                    <small className="oc-welcome__fine">
                        <span className="oc-nowrap">최대 {won(SIGNUP_COUPON_MAX)}</span> · <span className="oc-nowrap">쿠폰은 한 번 주문에 1장씩,</span>{' '}
                        <span className="oc-nowrap">받은 날부터 90일 안에 써요</span>
                    </small>
                </p>

                <label className={`oc-welcome__check oc-welcome__check--req${agreed ? ' is-on' : ''}`}>
                    <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setError(''); }} />
                    <span>
                        <b>(필수)</b> 만 14세 이상이며,{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer">이용약관</a>과{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="oc-nowrap">개인정보 수집·이용</a>에 동의합니다.
                    </span>
                </label>
                <label className={`oc-welcome__check${marketing ? ' is-on' : ''}`}>
                    <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
                    <span>
                        (선택) 쿠폰 만료·새 맛·회원 전용 할인 소식을 받을게요
                        <b className="oc-welcome__gift">🎁 알림 받기 쿠폰 {won(CONSENT_COUPON_AMOUNT)}</b>
                        <small className="oc-welcome__fine">이메일·카카오톡·문자로 보내요. 주문·배송 안내는 동의와 상관없이 보내 드려요. 언제든 끌 수 있어요.</small>
                    </span>
                </label>

                {error ? <p className="oc-auth__msg oc-auth__msg--error" role="alert">{error}</p> : null}

                <button type="button" className="oc-welcome__start" onClick={start} disabled={busy}>
                    {busy ? '가입하는 중...' : '동의하고 시작하기'}
                </button>

                <div className="oc-auth__collect">
                    <strong>가입 시 받는 정보</strong>
                    <ul>
                        <li>카카오: 닉네임(필수), 이메일(선택)</li>
                        <li>네이버: 이름(필수), 이메일(선택)</li>
                        <li>구글: 이름, 이메일</li>
                    </ul>
                    <p>회원 식별과 서비스 안내 목적으로만 쓰고, 탈퇴하면 삭제해요. (주문·결제 기록은 법령에 따라 일정 기간 보관)</p>
                </div>
                <p className="oc-auth__switch">
                    <a href="/">가입하지 않고 둘러보기</a>
                </p>
            </div>
        </main>
    );
}
