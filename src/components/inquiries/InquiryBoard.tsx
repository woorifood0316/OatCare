'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Lock, MessageCircleQuestion } from 'lucide-react';
import type { PublicInquiry } from '../../lib/inquiries';
import { WELCOME_COUPON_AMOUNT } from '../../lib/catalog';

const day = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const PAGE = 5;
/** After posting, look again a few times so the automatic answer shows up without a reload. */
const RECHECK_MS = [5000, 12000, 25000, 45000];

/** 상품문의 tab: rules, the question box (members only), and the questions with their answers (질문 / 답변 rows). */
export function InquiryBoard({ sku }: { sku: string }) {
    const [list, setList] = useState<PublicInquiry[] | null>(null);
    const [signedIn, setSignedIn] = useState(false);
    const [body, setBody] = useState('');
    const [secret, setSecret] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [shown, setShown] = useState(PAGE);
    const [here, setHere] = useState('/');
    const timers = useRef<number[]>([]);

    const load = useCallback(async () => {
        try {
            const r = await fetch(`/api/inquiries?sku=${encodeURIComponent(sku)}`, { cache: 'no-store' });
            const d = r.ok ? await r.json() : null;
            if (!d) return;
            setList(d.inquiries as PublicInquiry[]);
            setSignedIn(Boolean(d.signedIn));
        } catch {
            setList((l) => l ?? []);
        }
    }, [sku]);

    useEffect(() => {
        setHere(`${location.pathname}#pd-qna`);
        load();
        const pending = timers.current;
        return () => pending.forEach((t) => window.clearTimeout(t));
    }, [load]);

    const submit = async () => {
        if (busy) return;
        if (body.trim().length < 5) return setError('문의 내용을 5자 이상 적어 주세요');
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const res = await fetch('/api/inquiries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sku, body, secret }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError((data.error as string) ?? '문의를 남기지 못했어요');
            } else {
                setList(data.inquiries as PublicInquiry[]);
                setBody('');
                setSecret(false);
                setShown(PAGE);
                setNotice('문의가 등록됐어요. 답변이 달리면 이곳과 마이페이지 > 상품 문의에서 확인할 수 있어요.');
                timers.current.forEach((t) => window.clearTimeout(t));
                timers.current = RECHECK_MS.map((ms) => window.setTimeout(load, ms));
            }
        } catch {
            setError('네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
        }
        setBusy(false);
    };

    const items = list ?? [];
    return (
        <div className="qa">
            <ul className="qa-rules">
                <li>
                    문의는 바로 등록되고, <b>AI가 참오트케어의 제품·배송 정보를 바탕으로 빠르게 답변</b>해 드려요. 그 밖의 문의는 담당자가 확인 후 답변드려요.
                </li>
                <li>
                    <b>취소·교환·반품</b>은 문의로 처리되지 않아요. <b>마이페이지 &gt; 주문·배송 &gt; 주문 상세</b>에서 신청해 주세요.
                </li>
                <li>공개 게시판이에요. 전화번호·주소 같은 개인정보는 쓰지 말아 주세요. 주문 관련 문의는 비밀글로 남겨 주세요.</li>
                <li>상품과 관계없는 글, 욕설·비방, 광고는 예고 없이 숨겨질 수 있어요.</li>
            </ul>

            {signedIn ? (
                <div className="qa-form">
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value.slice(0, 500))}
                        rows={3}
                        placeholder="궁금한 점을 남겨 주세요. 예: 찬물에 타도 잘 섞이나요?"
                        aria-label="문의 내용"
                    />
                    <div className="qa-form__row">
                        <label className="addr-check">
                            <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
                            <span>
                                <Lock size={13} /> 비밀글 (나와 관리자만 보기)
                            </span>
                        </label>
                        <button type="button" className="my-btn my-btn--primary" onClick={submit} disabled={busy}>
                            {busy ? '등록 중...' : '문의하기'}
                        </button>
                    </div>
                    {error ? (
                        <p className="my-error" role="alert">
                            {error}
                        </p>
                    ) : null}
                    {notice ? <p className="qa-notice">{notice}</p> : null}
                </div>
            ) : (
                <div className="qa-join">
                    <p className="qa-join__title">
                        <Lock size={16} /> 상품 문의는 회원만 작성할 수 있어요
                    </p>
                    <p>
                        회원가입 후 궁금한 점을 남겨 주시면 <b>AI가 빠르게 답변</b>해 드려요. 지금 가입하면 <b>{WELCOME_COUPON_AMOUNT.toLocaleString('ko-KR')}원 웰컴 쿠폰</b>도 드려요.
                    </p>
                    <div className="qa-join__btns">
                        <Link href={`/login?callbackUrl=${encodeURIComponent(here)}`} className="my-btn my-btn--primary">
                            회원가입하고 문의하기
                        </Link>
                    </div>
                </div>
            )}

            {list === null ? (
                <p className="pd-empty">문의를 불러오는 중이에요...</p>
            ) : items.length === 0 ? (
                <p className="pd-empty">
                    <MessageCircleQuestion size={18} /> 아직 등록된 문의가 없어요. 첫 문의를 남겨 주세요.
                </p>
            ) : (
                <ul className="qa-list">
                    {items.slice(0, shown).map((q) => (
                        <li key={q.id} className="qa-row">
                            <div className="qa-row__q">
                                <span className="qa-tag">질문</span>
                                <div className="qa-row__main">
                                    <p>
                                        {q.body === null ? (
                                            <span className="qa-secret">
                                                <Lock size={13} /> 비밀글이에요
                                            </span>
                                        ) : (
                                            <>
                                                {q.secret ? <Lock size={13} className="qa-lock" /> : null}
                                                {q.body}
                                            </>
                                        )}
                                    </p>
                                    <small>
                                        {q.authorName}
                                        {q.mine ? ' (나)' : ''}
                                    </small>
                                </div>
                                <time className="qa-row__date">{day(q.createdAt)}</time>
                            </div>

                            {q.status === 'answered' && q.answer !== null ? (
                                <div className="qa-row__a">
                                    <span className="qa-row__arrow" aria-hidden="true">
                                        ↳
                                    </span>
                                    <span className="qa-tag qa-tag--a">답변</span>
                                    <div className="qa-row__main">
                                        <b className="qa-row__who">
                                            참오트케어
                                            {q.answeredBy === 'ai' ? <span className="qa-ai">AI 자동 답변</span> : null}
                                        </b>
                                        <p>{q.answer}</p>
                                    </div>
                                    {q.answeredAt ? <time className="qa-row__date">{day(q.answeredAt)}</time> : null}
                                </div>
                            ) : q.status === 'answered' ? (
                                <p className="qa-row__wait is-done">↳ 답변 완료 (비밀글)</p>
                            ) : (
                                <p className="qa-row__wait">↳ {q.waiting === 'auto' ? '답변을 준비하고 있어요' : '담당자가 확인 후 답변드릴게요'}</p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {items.length > shown ? (
                <button type="button" className="my-btn qa-more" onClick={() => setShown((n) => n + PAGE * 2)}>
                    문의 더보기 ({items.length - shown})
                </button>
            ) : null}
        </div>
    );
}
