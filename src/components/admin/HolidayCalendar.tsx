'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import { formatLeft, holidayName, isShippingDay, parseKey, shipEstimate, todayKey, type ShipOverrides } from '../../lib/ship-date';

type Row = { day: string; kind: 'closed' | 'open'; memo: string };

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const PRESETS = ['임시공휴일', '선거일', '택배 없는 날', '회사 휴무'];
const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const fmtDay = (k: string) => {
    const d = parseKey(k);
    return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEK[d.getUTCDay()]})`;
};

/**
 * Admin shipping calendar. Weekends and public holidays (computed automatically) are already days off;
 * the operator adds extra days off (closed) or ships on an automatic holiday (open).
 */
export function HolidayCalendar({ initial }: { initial: Row[] }) {
    const today = todayKey();
    const [rows, setRows] = useState<Row[]>(initial);
    const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
    const [sel, setSel] = useState<string | null>(null);
    const [memo, setMemo] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    // the live preview depends on the clock: render it only in the browser (no server/client mismatch)
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        setNow(new Date());
        const t = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(t);
    }, []);

    const byDay = useMemo(() => new Map(rows.map((r) => [r.day, r])), [rows]);
    const overrides: ShipOverrides = useMemo(
        () => ({
            closed: new Set(rows.filter((r) => r.kind === 'closed').map((r) => r.day)),
            open: new Set(rows.filter((r) => r.kind === 'open').map((r) => r.day)),
        }),
        [rows],
    );

    const first = new Date(Date.UTC(ym.y, ym.m - 1, 1));
    const daysInMonth = new Date(Date.UTC(ym.y, ym.m, 0)).getUTCDate();
    const cells: (string | null)[] = [...Array(first.getUTCDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => keyOf(ym.y, ym.m, i + 1))];
    while (cells.length % 7) cells.push(null);

    const move = (d: number) => {
        setSel(null);
        setYm(({ y, m }) => {
            const t = m + d;
            return t < 1 ? { y: y - 1, m: 12 } : t > 12 ? { y: y + 1, m: 1 } : { y, m: t };
        });
    };

    const save = async (day: string, kind: 'closed' | 'open' | null) => {
        setBusy(true);
        setErr('');
        try {
            const res =
                kind === null
                    ? await fetch(`/api/admin/ship-calendar?day=${day}`, { method: 'DELETE' })
                    : await fetch('/api/admin/ship-calendar', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ day, kind, memo }),
                      });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j.error ?? '저장하지 못했어요');
            setRows((prev) => {
                const rest = prev.filter((r) => r.day !== day);
                return kind === null ? rest : [...rest, { day, kind, memo: memo.trim() }].sort((a, b) => a.day.localeCompare(b.day));
            });
            setMemo('');
        } catch (e) {
            setErr(e instanceof Error ? e.message : '저장하지 못했어요');
        } finally {
            setBusy(false);
        }
    };

    const eta = now ? shipEstimate(now, overrides) : null;
    const upcoming = rows.filter((r) => r.day >= today);

    // Selected day panel
    let panel: React.ReactNode = null;
    if (sel) {
        const d = parseKey(sel);
        const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
        const legal = holidayName(sel);
        const ov = byDay.get(sel);
        const past = sel < today;
        const status = ov
            ? ov.kind === 'closed'
                ? `휴무 지정${ov.memo ? ` · ${ov.memo}` : ''}`
                : `발송함 (예외 영업일)${ov.memo ? ` · ${ov.memo}` : ''}`
            : weekend
              ? '주말 (발송 안 함)'
              : legal
                ? `공휴일 · ${legal} (자동, 발송 안 함)`
                : '발송일';
        panel = (
            <div className="hc-panel">
                <strong>{fmtDay(sel)}</strong>
                <p className="adm-muted">현재: {status}</p>
                {past ? (
                    <p className="adm-muted">지난 날짜는 바꿀 수 없어요.</p>
                ) : ov ? (
                    <button type="button" className="adm-btn" disabled={busy} onClick={() => save(sel, null)}>
                        지정 해제 (자동 규칙으로 되돌리기)
                    </button>
                ) : weekend ? (
                    <p className="adm-muted">주말은 택배사가 쉬어서 항상 발송하지 않아요.</p>
                ) : (
                    <>
                        <div className="hc-presets">
                            {(legal ? ['택배사 정상 운영', '근무일 조정'] : PRESETS).map((p) => (
                                <button key={p} type="button" className={`hc-chip${memo === p ? ' is-on' : ''}`} onClick={() => setMemo(p)}>
                                    {p}
                                </button>
                            ))}
                        </div>
                        <div className="adm-row">
                            <input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={60} placeholder="사유 (선택)" aria-label="사유" />
                            {legal ? (
                                <button type="button" className="adm-btn adm-btn--primary" disabled={busy} onClick={() => save(sel, 'open')}>
                                    이 날 발송함 (예외 영업일)
                                </button>
                            ) : (
                                <button type="button" className="adm-btn adm-btn--primary" disabled={busy} onClick={() => save(sel, 'closed')}>
                                    휴무일로 지정
                                </button>
                            )}
                        </div>
                    </>
                )}
                {err ? <p className="adm-error">{err}</p> : null}
            </div>
        );
    }

    return (
        <>
            <section className="adm-card hc-preview">
                <Truck size={18} />
                <span>
                    지금 고객에게 보이는 문구:{' '}
                    <b>{!eta ? '…' : eta.sameDay ? `${formatLeft(eta.msLeft)} 안에 결제하면 오늘 출발` : `지금 결제하면 ${eta.label} 출발`}</b>
                </span>
            </section>

            <section className="adm-card">
                <div className="hc-head">
                    <button type="button" className="adm-btn" onClick={() => move(-1)} aria-label="이전 달">
                        <ChevronLeft size={16} />
                    </button>
                    <h2>
                        {ym.y}년 {ym.m}월
                    </h2>
                    <button type="button" className="adm-btn" onClick={() => move(1)} aria-label="다음 달">
                        <ChevronRight size={16} />
                    </button>
                </div>
                <div className="hc-grid" role="grid">
                    {WEEK.map((w, i) => (
                        <div key={w} className={`hc-dow${i === 0 ? ' is-sun' : i === 6 ? ' is-sat' : ''}`}>
                            {w}
                        </div>
                    ))}
                    {cells.map((k, i) => {
                        if (!k) return <div key={`e${i}`} className="hc-cell is-empty" />;
                        const d = parseKey(k);
                        const ov = byDay.get(k);
                        const legal = holidayName(k);
                        const ships = isShippingDay(d, overrides);
                        const cls = [
                            'hc-cell',
                            ships ? 'is-ship' : 'is-off',
                            ov?.kind === 'closed' ? 'is-closed' : '',
                            ov?.kind === 'open' ? 'is-open' : '',
                            legal && !ov ? 'is-legal' : '',
                            d.getUTCDay() === 0 ? 'is-sun' : d.getUTCDay() === 6 ? 'is-sat' : '',
                            k === today ? 'is-today' : '',
                            k === sel ? 'is-sel' : '',
                            k < today ? 'is-past' : '',
                        ]
                            .filter(Boolean)
                            .join(' ');
                        const tag = ov ? (ov.kind === 'closed' ? ov.memo || '휴무' : '발송함') : legal;
                        return (
                            <button
                                key={k}
                                type="button"
                                className={cls}
                                onClick={() => {
                                    setSel(k);
                                    setMemo('');
                                    setErr('');
                                }}
                            >
                                <span className="hc-num">{d.getUTCDate()}</span>
                                {tag ? <span className="hc-tag">{tag}</span> : null}
                            </button>
                        );
                    })}
                </div>
                <ul className="hc-legend">
                    <li className="is-ship">발송일</li>
                    <li className="is-legal">공휴일 (자동)</li>
                    <li className="is-closed">휴무 지정</li>
                    <li className="is-open">예외 발송</li>
                </ul>
                {panel ?? <p className="adm-muted">날짜를 누르면 휴무일로 지정하거나, 공휴일에 발송하도록 바꿀 수 있어요.</p>}
            </section>

            <h2 className="adm-h2">지정한 날짜 {upcoming.length}건</h2>
            {upcoming.length === 0 ? (
                <p className="adm-muted">아직 따로 지정한 날이 없어요. 주말과 법정공휴일은 자동으로 쉬어요.</p>
            ) : (
                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr>
                                <th>날짜</th>
                                <th>구분</th>
                                <th>사유</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {upcoming.map((r) => (
                                <tr key={r.day}>
                                    <td>{fmtDay(r.day)}</td>
                                    <td>{r.kind === 'closed' ? '휴무' : '예외 발송'}</td>
                                    <td className="adm-break">{r.memo || '-'}</td>
                                    <td className="r">
                                        <button type="button" className="adm-btn adm-btn--danger-ghost" disabled={busy} onClick={() => save(r.day, null)}>
                                            해제
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
