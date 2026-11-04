'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from 'lucide-react';

export type ColumnKey = 'no' | 'date' | 'name' | 'product' | 'kind' | 'status' | 'amount';

type Option = { value: string; label: string };

/** Which URL params each column's filter owns (cleared together by "필터 지우기"). */
const PARAMS: Record<ColumnKey, string[]> = {
    no: ['no'],
    date: ['from', 'to'],
    name: ['name'],
    product: ['product'],
    kind: ['kind'],
    status: ['status'],
    amount: ['min', 'max'],
};
/** Sorting a column for the first time: newest / largest first for date and amount, A→Z otherwise. */
const FIRST_DIR: Record<ColumnKey, 'asc' | 'desc'> = { no: 'desc', date: 'desc', name: 'asc', product: 'asc', kind: 'asc', status: 'asc', amount: 'desc' };

const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const shift = (day: string, n: number) => {
    const d = new Date(`${day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

/**
 * Admin orders table header cell with Excel-like controls:
 * click the label to sort (again to flip), the funnel opens this column's filter.
 * Everything lives in the URL, so paging, reloads and the Excel export use the same view.
 */
export function OrderColumnHead({
    col,
    label,
    align,
    options,
}: {
    col: ColumnKey;
    label: string;
    align?: 'right';
    /** Choices for product / kind / status columns. */
    options?: Option[];
}) {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const popRef = useRef<HTMLDivElement>(null);

    const get = (k: string) => sp.get(k) ?? '';
    const [draft, setDraft] = useState<Record<string, string>>({});
    const active = PARAMS[col].some((k) => get(k));
    const sorted = get('sort') === col ? (get('dir') === 'asc' ? 'asc' : 'desc') : null;

    const go = (changes: Record<string, string | null>) => {
        const p = new URLSearchParams(sp.toString());
        for (const [k, v] of Object.entries(changes)) {
            if (v) p.set(k, v);
            else p.delete(k);
        }
        p.delete('page');
        const s = p.toString();
        router.push(s ? `${pathname}?${s}` : pathname);
        setOpen(false);
    };

    const toggleSort = () => go({ sort: col, dir: sorted ? (sorted === 'asc' ? 'desc' : 'asc') : FIRST_DIR[col] });

    const openPop = () => {
        setDraft(Object.fromEntries(PARAMS[col].map((k) => [k, get(k)])));
        setOpen((v) => !v);
    };

    // Fixed positioning: the table scrolls sideways, so an absolute pop-up would be clipped.
    useLayoutEffect(() => {
        if (!open || !btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        const width = 260;
        const left = Math.max(8, Math.min(window.innerWidth - width - 8, align === 'right' ? r.right - width : r.left - 8));
        setPos({ top: r.bottom + 6, left });
    }, [open, align]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!popRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        const onScroll = () => setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onScroll);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onScroll);
        };
    }, [open]);

    const set = (k: string, v: string) => setDraft((d) => ({ ...d, [k]: v }));
    const apply = () => go(Object.fromEntries(PARAMS[col].map((k) => [k, (draft[k] ?? '').trim() || null])));
    const clear = () => go(Object.fromEntries(PARAMS[col].map((k) => [k, null])));

    let body: React.ReactNode = null;
    if (col === 'no' || col === 'name') {
        body = (
            <input
                autoFocus
                value={draft[col] ?? ''}
                onChange={(e) => set(col, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && apply()}
                placeholder={col === 'no' ? '주문번호 일부 (예: 1103)' : '받는 분 이름'}
                aria-label={`${label} 포함`}
            />
        );
    } else if (col === 'date') {
        const today = kstToday();
        const month = `${today.slice(0, 8)}01`;
        body = (
            <>
                <div className="och-quick">
                    {[
                        ['오늘', today, today],
                        ['최근 7일', shift(today, -6), today],
                        ['최근 30일', shift(today, -29), today],
                        ['이번 달', month, today],
                    ].map(([t, f, to]) => (
                        <button key={t} type="button" onClick={() => setDraft({ from: f, to })}>
                            {t}
                        </button>
                    ))}
                </div>
                <label className="och-field">
                    <span>시작일</span>
                    <input type="date" value={draft.from ?? ''} onChange={(e) => set('from', e.target.value)} />
                </label>
                <label className="och-field">
                    <span>종료일</span>
                    <input type="date" value={draft.to ?? ''} onChange={(e) => set('to', e.target.value)} />
                </label>
            </>
        );
    } else if (col === 'amount') {
        body = (
            <>
                <label className="och-field">
                    <span>최소</span>
                    <input inputMode="numeric" value={draft.min ?? ''} onChange={(e) => set('min', e.target.value.replace(/[^\d]/g, ''))} placeholder="0" />
                    <em>원</em>
                </label>
                <label className="och-field">
                    <span>최대</span>
                    <input inputMode="numeric" value={draft.max ?? ''} onChange={(e) => set('max', e.target.value.replace(/[^\d]/g, ''))} placeholder="제한 없음" />
                    <em>원</em>
                </label>
            </>
        );
    } else if (col === 'status') {
        const chosen = new Set((draft.status ?? '').split(',').filter(Boolean));
        const toggle = (v: string) => {
            const n = new Set(chosen);
            if (n.has(v)) n.delete(v);
            else n.add(v);
            set('status', [...n].join(','));
        };
        body = (
            <div className="och-list">
                {options?.map((o) => (
                    <label key={o.value}>
                        <input type="checkbox" checked={chosen.has(o.value)} onChange={() => toggle(o.value)} />
                        <span>{o.label}</span>
                    </label>
                ))}
            </div>
        );
    } else {
        // product / kind: one choice
        body = (
            <div className="och-list">
                <label>
                    <input type="radio" name={`och-${col}`} checked={!draft[col]} onChange={() => set(col, '')} />
                    <span>전체</span>
                </label>
                {options?.map((o) => (
                    <label key={o.value}>
                        <input type="radio" name={`och-${col}`} checked={draft[col] === o.value} onChange={() => set(col, o.value)} />
                        <span>{o.label}</span>
                    </label>
                ))}
            </div>
        );
    }

    return (
        <th className={`och${align === 'right' ? ' r' : ''}${active ? ' is-filtered' : ''}`} aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <span className="och__in">
                <button type="button" className="och__sort" onClick={toggleSort} title="눌러서 정렬">
                    {label}
                    {sorted === 'asc' ? <ArrowUp size={13} /> : sorted === 'desc' ? <ArrowDown size={13} /> : <ArrowUpDown size={13} className="och__idle" />}
                </button>
                <button
                    ref={btnRef}
                    type="button"
                    className={`och__filter${active ? ' is-on' : ''}`}
                    onClick={openPop}
                    aria-expanded={open}
                    aria-label={`${label} 필터`}
                >
                    <Filter size={13} />
                </button>
            </span>
            {open && pos ? (
                <div ref={popRef} className="och-pop" style={{ top: pos.top, left: pos.left }} role="dialog" aria-label={`${label} 필터`}>
                    <div className="och-pop__sort">
                        <button type="button" className={sorted === 'asc' ? 'is-on' : ''} onClick={() => go({ sort: col, dir: 'asc' })}>
                            <ArrowUp size={13} /> {col === 'date' ? '오래된 순' : col === 'amount' ? '낮은 금액 순' : '오름차순'}
                        </button>
                        <button type="button" className={sorted === 'desc' ? 'is-on' : ''} onClick={() => go({ sort: col, dir: 'desc' })}>
                            <ArrowDown size={13} /> {col === 'date' ? '최신 순' : col === 'amount' ? '높은 금액 순' : '내림차순'}
                        </button>
                    </div>
                    <div className="och-pop__body">{body}</div>
                    <div className="och-pop__foot">
                        <button type="button" className="adm-btn" onClick={clear} disabled={!active}>
                            필터 지우기
                        </button>
                        <button type="button" className="adm-btn adm-btn--primary" onClick={apply}>
                            적용
                        </button>
                    </div>
                </div>
            ) : null}
        </th>
    );
}
