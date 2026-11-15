'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { promptInstall } from '../../lib/app-install';
import { openInAppHref } from '../../lib/app-switch';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { offerText, useAppInstall } from './useAppInstall';

/** This page's address with a one-time login attached (members), for continuing in Chrome / Safari. */
async function handoffUrl(): Promise<string> {
    const url = new URL(window.location.href);
    url.searchParams.delete('oc_handoff');
    try {
        const res = await fetch('/api/account/handoff', { method: 'POST' });
        const data = (await res.json()) as { token?: string | null };
        if (data.token) url.searchParams.set('oc_handoff', data.token);
    } catch {
        /* continue without the login hand-over */
    }
    return url.toString();
}

function Steps({ items }: { items: React.ReactNode[] }) {
    return (
        <ol className="app-steps">
            {items.map((it, i) => (
                <li key={i}>
                    <b>{i + 1}</b>
                    <span>{it}</span>
                </li>
            ))}
        </ol>
    );
}

/**
 * "참오트케어 앱 설치": the benefit, then the way to install for this phone / browser.
 * Opened from the menu, the cards, the home strip, and once right after sign-up (`joined`).
 */
export function InstallSheet({ onClose, joined = false }: { onClose: () => void; joined?: boolean }) {
    const ins = useAppInstall();
    const [state, setState] = useState<'idle' | 'busy' | 'installed' | 'copied'>('idle');
    const [error, setError] = useState('');
    useBodyScrollLock(true);

    const env = ins.env;
    const offer = offerText(ins.info);

    const install = async () => {
        setError('');
        const r = await promptInstall();
        if (r === 'accepted') setState('installed');
        else if (r === 'unavailable') setError('이 브라우저에서는 메뉴에서 직접 추가해 주세요.');
    };

    const moveTo = async (where: 'chrome' | 'safari') => {
        setState('busy');
        const url = await handoffUrl();
        if (where === 'chrome') {
            const href = openInAppHref('chrome', url);
            if (href) window.location.href = href;
        } else {
            window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
        }
        setTimeout(() => setState('idle'), 2500);
    };

    const copyLink = async () => {
        setState('busy');
        const url = await handoffUrl();
        try {
            await navigator.clipboard.writeText(url);
            setState('copied');
        } catch {
            window.prompt('아래 주소를 복사해 주세요', url);
            setState('idle');
        }
    };

    let how: React.ReactNode = null;
    if (state === 'installed') {
        how = (
            <div className="app-sheet__done">
                <strong>🎉 설치됐어요!</strong>
                <span>
                    홈 화면의 <b>참오트케어</b> 아이콘으로 들어오면 혜택이 바로 적용돼요.
                </span>
            </div>
        );
    } else if (!env || env.kind === 'standalone') {
        how = <p className="app-sheet__note">이미 앱으로 쓰고 계세요.</p>;
    } else if (env.kind === 'android' || env.kind === 'desktop') {
        how = ins.canPrompt ? (
            <button type="button" className="app-sheet__main" onClick={install}>
                {env.kind === 'desktop' ? '이 PC에 설치하기' : '홈 화면에 추가하기'}
            </button>
        ) : env.kind === 'android' ? (
            <Steps
                items={[
                    <>
                        브라우저 메뉴를 열어요 (크롬은 오른쪽 위 <b>⋮</b>, 삼성 인터넷은 아래 <b>≡</b>)
                    </>,
                    <>
                        <b>&lsquo;홈 화면에 추가&rsquo;</b> 또는 <b>&lsquo;앱 설치&rsquo;</b>를 눌러요
                    </>,
                    <>
                        <b>&lsquo;추가&rsquo;</b>(또는 &lsquo;설치&rsquo;)를 누르면 끝!
                    </>,
                ]}
            />
        ) : (
            <p className="app-sheet__note">휴대폰에서 참오트케어를 열면 홈 화면에 추가할 수 있어요.</p>
        );
    } else if (env.kind === 'ios-safari') {
        how = (
            <Steps
                items={[
                    <>
                        화면 아래 <b>공유 버튼</b>(네모에 위쪽 화살표 <span aria-hidden>⬆️</span>)을 눌러요
                    </>,
                    <>
                        목록을 내려 <b>&lsquo;홈 화면에 추가&rsquo;</b>를 눌러요
                    </>,
                    <>
                        오른쪽 위 <b>&lsquo;추가&rsquo;</b>를 누르면 끝!
                    </>,
                ]}
            />
        );
    } else if (env.kind === 'ios-other') {
        how = (
            <>
                <Steps
                    items={[
                        <>
                            주소창 옆 <b>공유 버튼</b>을 눌러요
                        </>,
                        <>
                            <b>&lsquo;홈 화면에 추가&rsquo;</b>를 눌러요 (메뉴에 없으면 아래 버튼으로 사파리에서 열어 주세요)
                        </>,
                    ]}
                />
                <button type="button" className="app-sheet__sub" onClick={copyLink} disabled={state === 'busy'}>
                    {state === 'copied' ? '복사했어요 · 사파리 주소창에 붙여 넣어 주세요' : '사파리용 링크 복사하기'}
                </button>
            </>
        );
    } else if (env.kind === 'inapp') {
        const appName = env.app === 'kakao' ? '카카오톡' : env.app === 'naver' ? '네이버 앱' : '이 앱';
        how = (
            <>
                <p className="app-sheet__note">
                    {appName} 안에서는 홈 화면에 추가할 수 없어요. {env.android ? '크롬' : '사파리'}에서 열면 바로 추가할 수 있어요
                    {ins.member ? ' (로그인도 그대로 이어져요)' : ''}.
                </p>
                {env.android ? (
                    <button type="button" className="app-sheet__main" onClick={() => moveTo('chrome')} disabled={state === 'busy'}>
                        {state === 'busy' ? '여는 중...' : '크롬에서 열고 설치하기'}
                    </button>
                ) : env.app === 'kakao' ? (
                    <button type="button" className="app-sheet__main" onClick={() => moveTo('safari')} disabled={state === 'busy'}>
                        {state === 'busy' ? '여는 중...' : '사파리에서 열고 설치하기'}
                    </button>
                ) : (
                    <>
                        <button type="button" className="app-sheet__main" onClick={copyLink} disabled={state === 'busy'}>
                            {state === 'copied' ? '복사했어요 · 사파리 주소창에 붙여 넣어 주세요' : '사파리용 링크 복사하기'}
                        </button>
                        <p className="app-sheet__fine">메뉴에 &lsquo;Safari로 열기&rsquo;나 &lsquo;기본 브라우저로 열기&rsquo;가 있으면 그걸 눌러도 돼요.</p>
                    </>
                )}
                {ins.member ? <p className="app-sheet__fine">로그인을 이어 주는 링크는 3분 동안 한 번만 쓸 수 있어요.</p> : null}
            </>
        );
    }

    return (
        <div className="app-sheet-overlay" role="dialog" aria-modal="true" aria-label="참오트케어 앱 설치" onClick={onClose}>
            <div className="app-sheet" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="app-sheet__close" onClick={onClose} aria-label="닫기">
                    <X size={20} />
                </button>
                <div className="app-sheet__head">
                    <img src="/icon-192.png" alt="" className="app-sheet__icon" />
                    <div>
                        {joined ? <span className="app-sheet__kicker">🎉 가입을 환영해요! 혜택 하나 더</span> : null}
                        <h2>홈 화면에 참오트케어 추가하기</h2>
                    </div>
                </div>
                <ul className="app-sheet__perks">
                    <li>
                        🎟️ <b>{offer.headline}</b>
                    </li>
                    <li>📲 아이콘 한 번으로 바로 들어와요</li>
                    <li>🔐 로그인이 계속 유지돼요</li>
                    <li>📦 쿠폰·주문·배송 조회를 바로 확인해요</li>
                </ul>
                {how}
                {error ? <p className="app-sheet__error">{error}</p> : null}
                <p className="app-sheet__fine">
                    설치한 뒤 홈 화면의 아이콘으로 들어와 {ins.member ? '' : '가입·'}로그인하면 쿠폰 혜택이 바로 적용돼요 (회원당 한 번). 앱 스토어 설치는 필요 없어요.
                </p>
                <button type="button" className="app-sheet__later" onClick={onClose}>
                    나중에 할게요
                </button>
            </div>
        </div>
    );
}
