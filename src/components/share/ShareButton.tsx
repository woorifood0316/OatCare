'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Copy, Gift, MessageCircle, Share2, X } from 'lucide-react';
import { REFERRAL_REWARD } from '../../lib/catalog';
import { shareToKakao } from '../../lib/kakao-sdk';
import { InviteRules } from './InviteRules';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/**
 * 공유하기 on product pages. Members share a link carrying their invitation code; visitors who aren't signed in are
 * told that only a member's link earns the invitation coupons, and can sign up first or share without benefits.
 */
export function ShareButton({
    title,
    description,
    image,
    label,
    className,
}: {
    title: string;
    description: string;
    image: string;
    /** Text button instead of the share icon. */
    label?: string;
    className?: string;
}) {
    const { status } = useSession();
    const [step, setStep] = useState<'closed' | 'guest' | 'sheet'>('closed');
    const [code, setCode] = useState<string | null>(null);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (step === 'closed') return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setStep('closed');
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [step]);

    const open = async () => {
        setMsg('');
        if (status !== 'authenticated') return setStep('guest');
        setStep('sheet');
        if (!code) {
            const r = await fetch('/api/referral').catch(() => null);
            const d = r && r.ok ? await r.json() : null;
            if (d?.code) setCode(d.code as string);
        }
    };

    const link = () => {
        const url = new URL(window.location.pathname, window.location.origin);
        if (code) url.searchParams.set('ref', code);
        return url.toString();
    };
    const imageUrl = () => new URL(image, window.location.origin).toString();

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link());
            setMsg('링크를 복사했어요. 카카오톡·문자에 붙여 넣어 보내 주세요.');
        } catch {
            setMsg(link());
        }
    };
    const kakao = async () => {
        try {
            await shareToKakao({ title, description, imageUrl: imageUrl(), url: link() });
        } catch {
            await copy();
        }
    };
    const native = async () => {
        try {
            await navigator.share({ title, text: description, url: link() });
        } catch {
            /* closed */
        }
    };
    const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const here = typeof window !== 'undefined' ? window.location.pathname : '/';

    return (
        <>
            {label ? (
                <button type="button" className={className} onClick={open}>
                    {label}
                </button>
            ) : (
                <button type="button" className="shr-btn" onClick={open} aria-label="공유하기">
                    <Share2 size={18} />
                </button>
            )}

            {step !== 'closed' ? (
                <div className="shr" role="dialog" aria-modal="true" aria-label="공유하기" onClick={() => setStep('closed')}>
                    <section className="shr__card" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="shr__close" onClick={() => setStep('closed')} aria-label="닫기">
                            <X size={20} />
                        </button>

                        {step === 'guest' ? (
                            <>
                                <Gift size={30} className="shr__gift" />
                                <h2>회원으로 공유하면 쿠폰을 드려요</h2>
                                <p>
                                    회원가입 후 공유하면 <b>나만의 초대 링크</b>가 만들어져요. 친구가 그 링크로 가입하고 첫 구매가 확정되면 <b>나와 친구 모두 {won(REFERRAL_REWARD)} 쿠폰</b>을 받아요.
                                </p>
                                <p className="shr__warn">회원가입 없이 공유하면 초대 혜택이 없어요.</p>
                                <Link href={`/login?callbackUrl=${encodeURIComponent(here)}`} className="shr__primary" onClick={() => setStep('closed')}>
                                    회원가입하고 공유하기
                                </Link>
                                <button type="button" className="shr__plain" onClick={() => setStep('sheet')}>
                                    혜택 없이 그냥 공유할게요
                                </button>
                                <details className="shr__rules">
                                    <summary>친구 초대 쿠폰 기준 보기</summary>
                                    <InviteRules />
                                </details>
                            </>
                        ) : (
                            <>
                                <h2>친구에게 공유하기</h2>
                                {status === 'authenticated' ? (
                                    <p className="shr__perk">
                                        <Gift size={15} /> 내 초대 링크로 친구가 가입하고 첫 구매가 확정되면 <b>나와 친구 모두 {won(REFERRAL_REWARD)} 쿠폰</b>
                                    </p>
                                ) : (
                                    <p className="shr__warn">초대 혜택 없이 공유돼요.</p>
                                )}
                                <div className="shr__actions">
                                    <button type="button" className="shr__kakao" onClick={kakao}>
                                        <MessageCircle size={18} /> 카카오톡으로 보내기
                                    </button>
                                    <button type="button" className="shr__copy" onClick={copy}>
                                        <Copy size={18} /> 링크 복사
                                    </button>
                                    {canNative ? (
                                        <button type="button" className="shr__copy" onClick={native}>
                                            <Share2 size={18} /> 다른 앱으로 공유
                                        </button>
                                    ) : null}
                                </div>
                                {msg ? <p className="shr__msg">{msg}</p> : null}
                                {status === 'authenticated' ? (
                                    <>
                                        <details className="shr__rules">
                                            <summary>친구 초대 쿠폰 기준 보기</summary>
                                            <InviteRules />
                                        </details>
                                        <Link href="/mypage/invite" className="shr__mine" onClick={() => setStep('closed')}>
                                            내가 초대한 친구 보기 ›
                                        </Link>
                                    </>
                                ) : null}
                            </>
                        )}
                    </section>
                </div>
            ) : null}
        </>
    );
}
