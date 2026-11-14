'use client';

import React, { useMemo, useState } from 'react';
import { FaqRowActions } from './InquiryAdminActions';

export interface FaqCard {
    id: string;
    question: string;
    keywords: string;
    answer: string;
    sku: string | null;
    scope: string; // "전체 상품" or the product name
    active: boolean;
    hits: number;
    auto: boolean; // written from the package label (re-sync overwrites edits)
}

/** FAQ list as cards with search, product filter and an on/off filter. */
export function FaqList({ faqs, scopes }: { faqs: FaqCard[]; scopes: string[] }) {
    const [q, setQ] = useState('');
    const [scope, setScope] = useState('');
    const [state, setState] = useState<'active' | 'off' | 'all'>('active');
    const [kind, setKind] = useState<'' | 'auto' | 'manual'>('');

    const shown = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return faqs.filter(
            (f) =>
                (state === 'all' || (state === 'active' ? f.active : !f.active)) &&
                (!scope || f.scope === scope) &&
                (!kind || (kind === 'auto' ? f.auto : !f.auto)) &&
                (!needle || `${f.question} ${f.keywords} ${f.answer}`.toLowerCase().includes(needle)),
        );
    }, [faqs, q, scope, state, kind]);

    return (
        <section className="adm-card">
            <h2>정보 목록</h2>
            <div className="adm-filters faq-filters">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="질문·답변·키워드 검색" aria-label="검색" />
                <select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="상품">
                    <option value="">상품 전체</option>
                    {scopes.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="종류">
                    <option value="">종류 전체</option>
                    <option value="manual">직접 등록</option>
                    <option value="auto">제품 정보(표기사항)</option>
                </select>
                <select value={state} onChange={(e) => setState(e.target.value as typeof state)} aria-label="상태">
                    <option value="active">사용 중</option>
                    <option value="off">사용 중지</option>
                    <option value="all">전체</option>
                </select>
                <span className="adm-muted">{shown.length}개</span>
            </div>

            <ul className="faq-cards">
                {shown.map((f) => (
                    <li key={f.id} className={`faq-card${f.active ? '' : ' is-off'}`}>
                        <div className="faq-card__head">
                            <span className="faq-badge">{f.scope}</span>
                            {f.auto ? <span className="faq-badge faq-badge--auto">제품 정보</span> : null}
                            {!f.active ? <span className="faq-badge faq-badge--off">사용 중지</span> : null}
                            <span className="faq-card__hits">자동 답변 {f.hits}회</span>
                        </div>
                        <p className="faq-card__q">Q. {f.question}</p>
                        <p className="faq-card__a">A. {f.answer}</p>
                        {f.keywords ? <p className="faq-card__k">비슷한 표현: {f.keywords}</p> : null}
                        {f.auto ? <p className="faq-card__k">포장 표기사항으로 만든 답변이에요. [제품 정보 답변 다시 만들기]를 누르면 수정한 내용이 표기사항 기준으로 되돌아가요.</p> : null}
                        <div className="faq-card__actions">
                            <FaqRowActions faq={f} />
                        </div>
                    </li>
                ))}
            </ul>
            {shown.length === 0 ? <p className="adm-muted">조건에 맞는 FAQ가 없어요.</p> : null}
        </section>
    );
}
