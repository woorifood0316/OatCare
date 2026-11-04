'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { getAssetUrl } from '../utils/assets';

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
                <p className="oc-auth__perk">🎟️ 가입하면 <b>3,000원 쿠폰</b>을 바로 드려요 (30일 이내 사용)</p>

                <label className={`oc-welcome__check oc-welcome__check--req${agreed ? ' is-on' : ''}`}>
                    <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setError(''); }} />
                    <span>
                        <b>(필수)</b> 만 14세 이상이며,{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer">이용약관</a>과{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer">개인정보 수집·이용</a>에 동의합니다.
                    </span>
                </label>
                <label className={`oc-welcome__check${marketing ? ' is-on' : ''}`}>
                    <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
                    <span>(선택) 신제품·혜택 소식을 받을게요.</span>
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
