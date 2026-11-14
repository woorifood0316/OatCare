'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_KO: Record<string, string> = { pending: '대기', sent: '발송됨', skipped: '건너뜀', failed: '실패' };
const CHANNEL_KO: Record<string, string> = { email: '고객 이메일', admin: '운영자 알림' };
const dt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

export interface Row {
    id: string;
    channel: string;
    event: string;
    eventLabel: string;
    status: string;
    error: string | null;
    createdAt: string;
    sentAt: string | null;
    userName: string | null;
    email: string | null;
}

async function post(body: unknown): Promise<{ error?: string; data?: Record<string, unknown> }> {
    const res = await fetch('/api/admin/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (data.error as string) ?? '처리하지 못했어요' };
    return { data };
}

/** The list with checkboxes: pick some (or all shown by the filter) and send them again. */
export function NotificationTable({ rows }: { rows: Row[] }) {
    const router = useRouter();
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState('');
    const all = rows.length > 0 && picked.size === rows.length;
    const toggle = (id: string) =>
        setPicked((s) => {
            const n = new Set(s);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });

    const resend = async () => {
        if (picked.size === 0 || busy) return;
        if (!window.confirm(`선택한 ${picked.size}건을 다시 보낼까요? 고객 이메일은 실제로 고객에게 발송돼요.`)) return;
        setBusy(true);
        setResult('');
        const r = await post({ action: 'resend', ids: [...picked] });
        setBusy(false);
        if (r.error) return setResult(r.error);
        const d = r.data ?? {};
        setResult(`${d.queued}건을 다시 보냈어요 · 발송 ${d.sent} · 건너뜀 ${d.skipped} · 실패 ${d.failed}`);
        setPicked(new Set());
        router.refresh();
    };

    return (
        <>
            <div className="adm-row adm-noti-bar">
                <span className="adm-muted">{picked.size > 0 ? `${picked.size}건 선택됨` : '다시 보낼 알림을 골라 주세요'}</span>
                <button type="button" className="adm-btn adm-btn--primary" disabled={picked.size === 0 || busy} onClick={resend}>
                    {busy ? '보내는 중...' : '선택한 알림 다시 보내기'}
                </button>
                {result ? <span className="adm-muted">{result}</span> : null}
            </div>
            <div className="adm-table-wrap">
                <table className="adm-table">
                    <thead>
                        <tr>
                            <th>
                                <input type="checkbox" checked={all} onChange={() => setPicked(all ? new Set() : new Set(rows.map((r) => r.id)))} aria-label="전체 선택" />
                            </th>
                            <th>일시</th>
                            <th>채널</th>
                            <th>내용</th>
                            <th>대상</th>
                            <th>상태</th>
                            <th>오류</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((n) => (
                            <tr key={n.id} className={picked.has(n.id) ? 'is-picked' : ''}>
                                <td>
                                    <input type="checkbox" checked={picked.has(n.id)} onChange={() => toggle(n.id)} aria-label="선택" />
                                </td>
                                <td>{dt(n.createdAt)}</td>
                                <td>{CHANNEL_KO[n.channel] ?? n.channel}</td>
                                <td>{n.eventLabel}</td>
                                <td>
                                    {n.userName ?? '-'}
                                    {n.channel === 'email' && n.email ? <small className="adm-muted"><br />{n.email}</small> : null}
                                </td>
                                <td>
                                    {STATUS_KO[n.status] ?? n.status}
                                    {n.sentAt ? <small className="adm-muted"><br />{dt(n.sentAt)}</small> : null}
                                </td>
                                <td className="adm-break">{n.error ?? ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

/** Send one sample of each customer email to an address (nothing is queued; customers get nothing). */
export function TestMailBox({ defaultTo, kinds }: { defaultTo: string; kinds: { id: string; label: string }[] }) {
    const [to, setTo] = useState(defaultTo);
    const [chosen, setChosen] = useState<string[]>(kinds.map((k) => k.id));
    const [busy, setBusy] = useState(false);
    const [out, setOut] = useState<string[]>([]);
    const [error, setError] = useState('');

    const send = async () => {
        setBusy(true);
        setError('');
        setOut([]);
        const r = await post({ action: 'test', to, kinds: chosen });
        setBusy(false);
        if (r.error) return setError(r.error);
        const res = (r.data?.results as { kind: string; outcome: string }[]) ?? [];
        setOut(res.map((x) => `${kinds.find((k) => k.id === x.kind)?.label ?? x.kind}: ${x.outcome === 'sent' ? '보냄 ✓' : x.outcome}`));
    };

    return (
        <div className="adm-qa-box">
            <div className="adm-row">
                <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="받을 이메일" aria-label="받을 이메일" />
                <button type="button" className="adm-btn adm-btn--primary" onClick={send} disabled={busy || chosen.length === 0}>
                    {busy ? '보내는 중...' : '테스트 메일 보내기'}
                </button>
            </div>
            <div className="adm-row adm-noti-kinds">
                {kinds.map((k) => (
                    <label key={k.id} className="adm-check">
                        <input
                            type="checkbox"
                            checked={chosen.includes(k.id)}
                            onChange={(e) => setChosen((c) => (e.target.checked ? [...c, k.id] : c.filter((x) => x !== k.id)))}
                        />
                        {k.label}
                    </label>
                ))}
            </div>
            {error ? <small className="adm-error">{error}</small> : null}
            {out.length ? (
                <ul className="adm-noti-out">
                    {out.map((l) => (
                        <li key={l}>{l}</li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
