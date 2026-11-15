'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Ticket, X } from 'lucide-react';
import { openInstallSheet, wasMember } from '../../lib/app-install';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import {
    CONSENT_COUPON_AMOUNT,
    COUPON_VALID_DAYS,
    SIGNUP_COUPON_MAX,
    WELCOME_COUPON_AMOUNT,
    WELCOME_COUPON_BASE,
    WELCOME_COUPON_BONUS,
} from '../../lib/catalog';
import { useAppInstall } from './useAppInstall';
import { consentGiftText, type ConsentResult } from '../mypage/consentResult';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

type Ins = ReturnType<typeof useAppInstall>;

/** Which of the three sign-up steps are done for this visitor. */
function stepsOf(ins: Ins) {
    const member = ins.member;
    const appDone = Boolean(ins.env?.kind === 'standalone' || ins.info?.installed);
    const consentDone = Boolean(ins.info?.consentCoupon);
    return { member, appDone, consentDone, left: (member ? 0 : 1) + (appDone ? 0 : 1) + (consentDone ? 0 : 1) };
}

/**
 * Home band right above the sets: one line on the sign-up coupons, like the friend-invitation band. The details
 * (and the app install, the notification switch) open in a popup. Hidden once all three steps are done.
 */
export function SignupPerks() {
    const ins = useAppInstall();
    const [open, setOpen] = useState(false);
    if (!ins.ready) return null;
    const st = stepsOf(ins);
    if (st.left === 0) return null;

    const raise = ins.info?.offer !== 'bonus';
    let head: React.ReactNode;
    let sub: React.ReactNode;
    const inApp = ins.env?.kind === 'standalone';
    // In the app but not logged in: the app step is done; what is missing is the login (or the sign-up).
    if (inApp && !st.member) {
        const back = wasMember();
        return (
            <section id="signup-perks" className="perk-band" aria-label="가입 혜택">
                <div className="perk-band__inner">
                    <Ticket size={30} className="perk-band__icon" aria-hidden="true" />
                    <div className="perk-band__text">
                        <strong>{back ? <>로그인하면 앱 설치 혜택이 바로 적용돼요</> : <>지금 가입하면 쿠폰 {won(WELCOME_COUPON_AMOUNT)}부터</>}</strong>
                        <p>
                            {back ? (
                                <>앱에서는 처음 한 번만 로그인하면 계속 유지돼요.</>
                            ) : (
                                <>
                                    <span className="oc-chunk">앱으로 들어와서 가입하면</span>{' '}
                                    <span className="oc-chunk">가입 쿠폰이 바로 {won(WELCOME_COUPON_AMOUNT)}이에요.</span>
                                </>
                            )}
                        </p>
                    </div>
                    <Link href="/login?callbackUrl=%2F" className="perk-band__btn">
                        {back ? '로그인하기 →' : '3초 가입하기 →'}
                    </Link>
                </div>
            </section>
        );
    }
    if (!st.member) {
        head = <>가입하면 쿠폰 최대 {won(SIGNUP_COUPON_MAX)}</>;
        sub = (
            <>
                <span className="oc-chunk">앱까지 설치하면</span>{' '}
                <span className="oc-chunk">
                    가입 쿠폰이{' '}
                    <span className="oc-nowrap">
                        {won(WELCOME_COUPON_BASE)} → {won(WELCOME_COUPON_AMOUNT)}으로
                    </span>{' '}
                    올라가요.
                </span>
            </>
        );
    } else if (!st.appDone) {
        head = raise ? <>앱 설치하면 가입 쿠폰 {won(WELCOME_COUPON_AMOUNT)}</> : <>앱 설치하면 {won(WELCOME_COUPON_BONUS)} 쿠폰 더</>;
        sub = <>받을 수 있는 가입 혜택이 {st.left}개 남았어요.</>;
    } else {
        head = <>알림 받으면 {won(CONSENT_COUPON_AMOUNT)} 쿠폰 1장 더</>;
        sub = <>마지막 가입 혜택이 남았어요.</>;
    }

    return (
        <section id="signup-perks" className="perk-band" aria-label="가입 혜택">
            <div className="perk-band__inner">
                <Ticket size={30} className="perk-band__icon" aria-hidden="true" />
                <div className="perk-band__text">
                    <strong>{head}</strong>
                    <p>{sub}</p>
                </div>
                <button type="button" className="perk-band__btn" onClick={() => setOpen(true)}>
                    혜택 자세히 보기 →
                </button>
            </div>
            {open ? <PerksSheet ins={ins} onClose={() => setOpen(false)} /> : null}
        </section>
    );
}

function PerksSheet({ ins, onClose }: { ins: Ins; onClose: () => void }) {
    useBodyScrollLock(true);
    const st = stepsOf(ins);
    const raise = ins.info?.offer !== 'bonus';
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [gift, setGift] = useState('');

    const turnOn = async () => {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/account/marketing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agreed: true }),
            });
            if (!res.ok) throw new Error();
            const data = (await res.json().catch(() => ({}))) as ConsentResult;
            setGift(consentGiftText(data) || `알림 받기 쿠폰 ${won(CONSENT_COUPON_AMOUNT)}`);
            ins.refresh();
        } catch {
            setError('켜지 못했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setBusy(false);
        }
    };

    const done = (
        <span className="perk-step__done">
            <Check size={15} /> 받았어요
        </span>
    );

    return (
        <div className="app-sheet-overlay" role="dialog" aria-modal="true" aria-label="가입 혜택" onClick={onClose}>
            <div className="app-sheet" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="app-sheet__close" onClick={onClose} aria-label="닫기">
                    <X size={20} />
                </button>
                <div className="app-sheet__head">
                    <div>
                        <span className="app-sheet__kicker">참오트케어 가입 혜택</span>
                        <h2>쿠폰 최대 {won(SIGNUP_COUPON_MAX)}, 3단계로 받아요</h2>
                    </div>
                </div>

                <ol className="perk-steps">
                    <li className={st.member ? 'is-done' : ''}>
                        <b className="perk-step__no">1</b>
                        <div className="perk-step__body">
                            <strong>회원가입</strong>
                            <span>신규 가입 쿠폰 {won(WELCOME_COUPON_BASE)}</span>
                        </div>
                        {st.member ? (
                            done
                        ) : (
                            <Link href="/login?callbackUrl=%2F%23signup-perks" className="perk-step__btn">
                                3초 가입
                            </Link>
                        )}
                    </li>
                    <li className={st.appDone ? 'is-done' : ''}>
                        <b className="perk-step__no">2</b>
                        <div className="perk-step__body">
                            <strong>홈 화면에 앱 설치</strong>
                            <span>
                                {raise ? (
                                    <>
                                        가입 쿠폰{' '}
                                        <span className="oc-nowrap">
                                            {won(WELCOME_COUPON_BASE)} → <b>{won(WELCOME_COUPON_AMOUNT)}</b>으로
                                        </span>{' '}
                                        업그레이드
                                    </>
                                ) : (
                                    <>
                                        앱 설치 쿠폰 <b>{won(WELCOME_COUPON_BONUS)}</b>
                                    </>
                                )}
                            </span>
                            {st.appDone ? null : <small>설치한 뒤 홈 화면 아이콘으로 들어와 로그인하면 바로 적용돼요.</small>}
                        </div>
                        {st.appDone ? (
                            done
                        ) : (
                            <button
                                type="button"
                                className="perk-step__btn"
                                onClick={() => {
                                    onClose();
                                    openInstallSheet();
                                }}
                            >
                                설치하기
                            </button>
                        )}
                    </li>
                    <li className={st.consentDone ? 'is-done' : ''}>
                        <b className="perk-step__no">3</b>
                        <div className="perk-step__body">
                            <strong>이벤트·혜택 알림 받기</strong>
                            <span>
                                알림 받기 쿠폰 <b>{won(CONSENT_COUPON_AMOUNT)}</b> 1장 더
                            </span>
                            {st.consentDone ? null : st.member ? (
                                <small>
                                    (선택) 쿠폰 만료·새 맛·회원 전용 할인 소식을 이메일·카카오톡·문자로 보내 드려요. 주문·배송 안내는 알림 설정과 상관없이 보내요.
                                    내 정보에서 언제든 끌 수 있고, 받은 쿠폰은 그대로예요.
                                </small>
                            ) : (
                                <small>가입할 때 알림 받기를 선택하면 바로 받아요.</small>
                            )}
                        </div>
                        {st.consentDone ? (
                            done
                        ) : st.member ? (
                            <button type="button" className="perk-step__btn" onClick={turnOn} disabled={busy}>
                                {busy ? '켜는 중...' : ins.info?.marketingAgreed ? '쿠폰 받기' : '알림 켜고 받기'}
                            </button>
                        ) : null}
                    </li>
                </ol>
                {gift ? (
                    <div className="app-sheet__done" role="status">
                        <strong>🎉 {gift}이 발급됐어요</strong>
                        <span>
                            이벤트·혜택 알림을 켰어요. <Link href="/mypage/coupons">쿠폰함에서 확인하기 →</Link>
                        </span>
                    </div>
                ) : null}
                {error ? <p className="app-sheet__error">{error}</p> : null}

                <p className="app-sheet__fine">
                    쿠폰은 한 번 주문에 1장씩 쓰고, 받은 날부터 {COUPON_VALID_DAYS}일 안에 쓰면 돼요. 20·30개 세트·정기구독은 금액 상관없이, 낱개는 20개(한 박스)부터 적용돼요.
                    각 혜택은 회원당 한 번이에요.
                </p>
                {st.member ? (
                    <Link href="/mypage/coupons" className="app-sheet__later">
                        내 쿠폰함 보기
                    </Link>
                ) : null}
            </div>
        </div>
    );
}
