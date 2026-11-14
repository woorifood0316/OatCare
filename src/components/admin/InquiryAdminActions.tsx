'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

async function post(url: string, method: 'PATCH' | 'POST', body: unknown): Promise<{ error?: string; data?: Record<string, unknown> }> {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (data.error as string) ?? '처리하지 못했어요' };
    return { data };
}

/** Answer (or correct the AI's answer), optionally saving it as an FAQ, or hide the question. */
export function InquiryAnswerBox({ id, question, current, status }: { id: string; question: string; current: string | null; status: string }) {
    const router = useRouter();
    const [answer, setAnswer] = useState(current ?? '');
    const [open, setOpen] = useState(status === 'pending');
    const [saveFaq, setSaveFaq] = useState(true);
    const [faqQuestion, setFaqQuestion] = useState(question.slice(0, 200));
    const [keywords, setKeywords] = useState('');
    const [hideReason, setHideReason] = useState('');
    const [hiding, setHiding] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const run = async (body: Record<string, unknown>) => {
        if (busy) return;
        setBusy(true);
        setError('');
        const r = await post(`/api/admin/inquiries/${id}`, 'PATCH', body);
        setBusy(false);
        if (r.error) return setError(r.error);
        setOpen(false);
        setHiding(false);
        router.refresh();
    };

    if (status === 'hidden') {
        return (
            <button type="button" className="adm-btn" onClick={() => run({ action: 'unhide' })} disabled={busy}>
                다시 보이기
            </button>
        );
    }
    if (!open && !hiding) {
        return (
            <div className="adm-row">
                <button type="button" className="adm-btn" onClick={() => setOpen(true)}>
                    {current ? '답변 수정' : '답변하기'}
                </button>
                <button type="button" className="adm-btn adm-btn--danger-ghost" onClick={() => setHiding(true)}>
                    숨기기
                </button>
            </div>
        );
    }
    if (hiding) {
        return (
            <div className="adm-qa-box">
                <input value={hideReason} onChange={(e) => setHideReason(e.target.value)} placeholder="숨김 사유 (예: 광고, 상품과 무관)" maxLength={200} />
                <div className="adm-row">
                    <button type="button" className="adm-btn" onClick={() => setHiding(false)} disabled={busy}>
                        닫기
                    </button>
                    <button type="button" className="adm-btn adm-btn--danger" onClick={() => run({ action: 'hide', reason: hideReason })} disabled={busy}>
                        숨기기
                    </button>
                </div>
                {error ? <small className="adm-error">{error}</small> : null}
            </div>
        );
    }
    return (
        <div className="adm-qa-box">
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} placeholder="답변 (상품 페이지와 고객의 마이페이지에 보여요)" maxLength={1000} />
            <label className="adm-check">
                <input type="checkbox" checked={saveFaq} onChange={(e) => setSaveFaq(e.target.checked)} />
                이 답변을 FAQ에 추가 (다음부터 비슷한 질문에 AI가 바로 답해요)
            </label>
            {saveFaq ? (
                <>
                    <input value={faqQuestion} onChange={(e) => setFaqQuestion(e.target.value)} placeholder="FAQ 질문 (대표 질문으로 다듬어 주세요)" maxLength={200} />
                    <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="비슷한 표현·키워드 (선택, 띄어쓰기로 구분)" maxLength={300} />
                </>
            ) : null}
            <div className="adm-row">
                <button type="button" className="adm-btn" onClick={() => setOpen(false)} disabled={busy}>
                    닫기
                </button>
                <button type="button" className="adm-btn adm-btn--primary" onClick={() => run({ action: 'answer', answer, saveFaq, faqQuestion, faqKeywords: keywords })} disabled={busy}>
                    {busy ? '저장 중...' : '답변 등록'}
                </button>
            </div>
            {error ? <small className="adm-error">{error}</small> : null}
        </div>
    );
}

type FaqRow = { id: string; question: string; keywords: string; answer: string; active: boolean };

/** Add or edit one FAQ. */
export function FaqEditor({ faq, onDone }: { faq?: FaqRow; onDone?: () => void }) {
    const router = useRouter();
    const [question, setQuestion] = useState(faq?.question ?? '');
    const [keywords, setKeywords] = useState(faq?.keywords ?? '');
    const [answer, setAnswer] = useState(faq?.answer ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const save = async () => {
        setBusy(true);
        setError('');
        const r = await post('/api/admin/faqs', 'POST', { action: faq ? 'update' : 'create', id: faq?.id, question, keywords, answer });
        setBusy(false);
        if (r.error) return setError(r.error);
        if (!faq) {
            setQuestion('');
            setKeywords('');
            setAnswer('');
        }
        onDone?.();
        router.refresh();
    };

    return (
        <div className="adm-qa-box">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="대표 질문 (예: 찬물에 타도 되나요?)" maxLength={200} />
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="비슷한 표현·키워드 (띄어쓰기로 구분, 예: 냉수 정수기 차가운물)" maxLength={300} />
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} placeholder="답변 (고객에게 이 문장 그대로 보여요)" maxLength={1000} />
            <div className="adm-row">
                {onDone ? (
                    <button type="button" className="adm-btn" onClick={onDone} disabled={busy}>
                        닫기
                    </button>
                ) : null}
                <button type="button" className="adm-btn adm-btn--primary" onClick={save} disabled={busy}>
                    {busy ? '저장 중...' : faq ? '저장' : 'FAQ 추가'}
                </button>
            </div>
            {error ? <small className="adm-error">{error}</small> : null}
        </div>
    );
}

export function FaqRowActions({ faq }: { faq: FaqRow }) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);

    const run = async (action: 'toggle' | 'delete') => {
        if (action === 'delete' && !window.confirm('이 FAQ를 삭제할까요?')) return;
        setBusy(true);
        await post('/api/admin/faqs', 'POST', { action, id: faq.id });
        setBusy(false);
        router.refresh();
    };

    if (editing) return <FaqEditor faq={faq} onDone={() => setEditing(false)} />;
    return (
        <div className="adm-row">
            <button type="button" className="adm-btn" onClick={() => setEditing(true)}>
                수정
            </button>
            <button type="button" className="adm-btn" onClick={() => run('toggle')} disabled={busy}>
                {faq.active ? '사용 중지' : '다시 사용'}
            </button>
            <button type="button" className="adm-btn adm-btn--danger-ghost" onClick={() => run('delete')} disabled={busy}>
                삭제
            </button>
        </div>
    );
}

/** Try a question and see which answer the customer would get (nothing is saved). */
export function FaqTester() {
    const [question, setQuestion] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ answer: string | null; faqQuestion: string | null; note: string; aiReady: boolean } | null>(null);
    const [error, setError] = useState('');

    const test = async () => {
        setBusy(true);
        setError('');
        const r = await post('/api/admin/faqs', 'POST', { action: 'test', question });
        setBusy(false);
        if (r.error) return setError(r.error);
        setResult(r.data as typeof result);
    };

    return (
        <div className="adm-qa-box">
            <div className="adm-row">
                <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="손님처럼 질문해 보세요 (예: 정수기 물로 타도 돼요?)" onKeyDown={(e) => e.key === 'Enter' && test()} />
                <button type="button" className="adm-btn adm-btn--primary" onClick={test} disabled={busy}>
                    {busy ? '확인 중...' : '시험하기'}
                </button>
            </div>
            {error ? <small className="adm-error">{error}</small> : null}
            {result ? (
                <div className="adm-qa-result">
                    <small>
                        {result.aiReady ? 'AI 연결됨' : 'AI 미연결 (글자 일치만 사용)'} · {result.note}
                    </small>
                    {result.answer ? (
                        <>
                            <b>고른 FAQ: {result.faqQuestion}</b>
                            <p>{result.answer}</p>
                        </>
                    ) : (
                        <p>자동 답변 없음 → 담당자 답변 대기로 접수돼요.</p>
                    )}
                </div>
            ) : null}
        </div>
    );
}

export function FaqSeedButton() {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    return (
        <div>
            <button
                type="button"
                className="adm-btn adm-btn--primary"
                disabled={busy}
                onClick={async () => {
                    setBusy(true);
                    const r = await post('/api/admin/faqs', 'POST', { action: 'seed' });
                    setBusy(false);
                    if (r.error) setError(r.error);
                    else router.refresh();
                }}
            >
                기본 FAQ 넣기
            </button>
            {error ? <small className="adm-error">{error}</small> : null}
        </div>
    );
}
