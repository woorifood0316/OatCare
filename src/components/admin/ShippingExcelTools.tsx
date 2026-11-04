'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Upload, FileSpreadsheet, Truck } from 'lucide-react';
import { CARRIERS } from '../../lib/order-status';

type Format = 'togle' | 'naver';
const TOGLE_CARRIER_KEY = 'oc-admin-togle-carrier';

interface Filter {
    status?: string;
    kind?: string;
    q?: string;
    no?: string;
    name?: string;
    from?: string;
    to?: string;
    product?: string;
    min?: string;
    max?: string;
}

interface PreviewRow {
    line: number;
    orderNo: string;
    method: string;
    carrier: string;
    trackingNo: string;
    state: 'ok' | 'already' | 'error';
    message: string;
}
interface Preview {
    summary: { total: number; ok: number; already: number; error: number };
    rows: PreviewRow[];
}

const STATE_LABEL = { ok: '✅ 정상', already: '⚠️ 이미 등록됨', error: '❌ 오류' } as const;

function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function filenameOf(res: Response, fallback: string): string {
    const cd = res.headers.get('Content-Disposition') ?? '';
    const m = cd.match(/filename\*=UTF-8''([^;]+)/);
    return m ? decodeURIComponent(m[1]) : fallback;
}

/** Bulk actions for the admin orders list: delivery-info Excel download and tracking-number Excel upload. */
export function ShippingExcelTools({ filter }: { filter: Filter }) {
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);
    const togleRef = useRef<HTMLInputElement>(null);
    const [format, setFormat] = useState<Format>('naver');
    // TOGLE files have no carrier column: the operator picks it once (remembered in this browser).
    const [togleCarrier, setTogleCarrier] = useState('');
    useEffect(() => {
        try {
            setTogleCarrier(localStorage.getItem(TOGLE_CARRIER_KEY) ?? '');
        } catch {
            /* ignore */
        }
    }, []);
    const pickCarrier = (v: string) => {
        setTogleCarrier(v);
        try {
            localStorage.setItem(TOGLE_CARRIER_KEY, v);
        } catch {
            /* ignore */
        }
    };
    const [selected, setSelected] = useState(0);
    const [mark, setMark] = useState(false);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [overwrite, setOverwrite] = useState(false);

    // Row checkboxes are plain inputs rendered by the server component; read them from the page.
    useEffect(() => {
        const sync = () => setSelected(document.querySelectorAll<HTMLInputElement>('input.adm-sel:checked').length);
        const onChange = (e: Event) => {
            const t = e.target as HTMLInputElement;
            if (t.id === 'adm-sel-all') {
                document.querySelectorAll<HTMLInputElement>('input.adm-sel').forEach((c) => (c.checked = t.checked));
            }
            if (t.classList?.contains('adm-sel') || t.id === 'adm-sel-all') sync();
        };
        document.addEventListener('change', onChange);
        return () => document.removeEventListener('change', onChange);
    }, []);

    const download = async () => {
        if (busy) return;
        setBusy(true);
        setMsg(null);
        try {
            const orderNos = [...document.querySelectorAll<HTMLInputElement>('input.adm-sel:checked')].map((c) => c.dataset.order ?? '');
            const res = await fetch('/api/admin/orders/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderNos, ...filter, markPreparing: mark }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setMsg({ tone: 'err', text: (data.error as string) ?? '다운로드하지 못했어요' });
            } else {
                saveBlob(await res.blob(), filenameOf(res, '배송정보.xlsx'));
                setMsg({ tone: 'ok', text: `${res.headers.get('X-Order-Count') ?? ''}건의 배송정보를 내려받았어요${mark ? ' (상품 준비 중으로 변경)' : ''}` });
                if (mark) router.refresh();
            }
        } catch {
            setMsg({ tone: 'err', text: '네트워크 오류가 났어요' });
        }
        setBusy(false);
    };

    const send = async (f: File, mode: 'preview' | 'commit' | 'errors', ow = false, fmt: Format = format) => {
        const fd = new FormData();
        fd.set('file', f);
        fd.set('mode', mode);
        fd.set('format', fmt);
        if (fmt === 'togle') fd.set('carrier', togleCarrier);
        if (ow) fd.set('overwrite', '1');
        return fetch('/api/admin/orders/shipping-upload', { method: 'POST', body: fd });
    };

    const onPick = (fmt: Format) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        setBusy(true);
        setMsg(null);
        setFormat(fmt);
        try {
            const res = await send(f, 'preview', false, fmt);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) setMsg({ tone: 'err', text: (data.error as string) ?? '파일을 확인하지 못했어요' });
            else {
                setFile(f);
                setOverwrite(false);
                setPreview(data as Preview);
            }
        } catch {
            setMsg({ tone: 'err', text: '네트워크 오류가 났어요' });
        }
        setBusy(false);
    };

    const commit = async () => {
        if (!file || busy) return;
        setBusy(true);
        try {
            const res = await send(file, 'commit', overwrite);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) setMsg({ tone: 'err', text: (data.error as string) ?? '등록하지 못했어요' });
            else {
                setMsg({ tone: 'ok', text: `송장번호 ${data.applied}건을 등록했어요${data.skipped ? ` (제외 ${data.skipped}건)` : ''}` });
                setPreview(null);
                setFile(null);
                router.refresh();
            }
        } catch {
            setMsg({ tone: 'err', text: '네트워크 오류가 났어요' });
        }
        setBusy(false);
    };

    const downloadErrors = async () => {
        if (!file) return;
        const res = await send(file, 'errors');
        if (res.ok) saveBlob(await res.blob(), filenameOf(res, '송장번호_업로드_오류목록.xlsx'));
    };

    const target = selected > 0 ? `선택한 ${selected}건` : '현재 목록 전체';
    const applicable = preview ? preview.summary.ok + (overwrite ? preview.summary.already : 0) : 0;

    return (
        <section className="adm-card adm-excel">
            <h2>
                <FileSpreadsheet size={16} /> 엑셀 작업
            </h2>
            <div className="adm-excel__row">
                <button type="button" className="adm-btn adm-btn--primary" onClick={download} disabled={busy}>
                    <Download size={14} /> 배송정보 엑셀 다운로드 ({target})
                </button>
                <label className="adm-excel__check">
                    <input type="checkbox" checked={mark} onChange={(e) => setMark(e.target.checked)} />
                    <span>다운로드 후 &lsquo;상품 준비 중&rsquo;으로 변경</span>
                </label>
            </div>
            <p className="adm-muted">
                체크하지 않으면 현재 목록(상태를 고르지 않았으면 결제 완료·상품 준비 중 주문)이 모두 내려받아져요.
            </p>
            <h3 className="adm-excel__h3">송장번호 일괄 업로드</h3>
            <div className="adm-excel__row">
                <button
                    type="button"
                    className="adm-btn adm-btn--primary"
                    onClick={() => {
                        if (!togleCarrier) {
                            setMsg({ tone: 'err', text: '토글 송장의 택배사를 먼저 선택해 주세요' });
                            return;
                        }
                        togleRef.current?.click();
                    }}
                    disabled={busy}
                >
                    <Upload size={14} /> 토글 송장 파일 업로드
                </button>
                <label className="adm-excel__carrier">
                    <Truck size={14} />
                    <span>택배사</span>
                    <select value={togleCarrier} onChange={(e) => pickCarrier(e.target.value)} aria-label="토글 송장 택배사">
                        <option value="">선택</option>
                        {CARRIERS.map((c) => (
                            <option key={c.id} value={c.name}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </label>
                <input ref={togleRef} type="file" accept=".xlsx,.xls" hidden onChange={onPick('togle')} />
            </div>
            <p className="adm-muted">토글에서 내려받은 파일(TOGLE_…xlsx)을 그대로 올리면 돼요. 주문번호로 찾아 운송장번호를 등록하고 발송 처리해요.</p>
            <div className="adm-excel__row">
                <button type="button" className="adm-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
                    <Upload size={14} /> 직접 작성 양식 업로드
                </button>
                <a className="adm-btn" href="/api/admin/orders/template">
                    빈 양식 받기
                </a>
                <input ref={fileRef} type="file" accept=".xls,.xlsx" hidden onChange={onPick('naver')} />
            </div>
            {msg ? <p className={msg.tone === 'ok' ? 'adm-excel__ok' : 'adm-excel__err'}>{msg.text}</p> : null}

            {preview ? (
                <div className="adm-modal" role="dialog" aria-modal="true">
                    <div className="adm-modal__card">
                        <h3>{format === 'togle' ? `토글 송장 업로드 미리보기 · ${togleCarrier}` : '송장번호 업로드 미리보기'}</h3>
                        <p className="adm-muted">
                            전체 {preview.summary.total}행 · 정상 {preview.summary.ok} · 이미 등록됨 {preview.summary.already} · 오류{' '}
                            {preview.summary.error}
                        </p>
                        <div className="adm-modal__table">
                            <table className="adm-table">
                                <thead>
                                    <tr>
                                        <th>행</th>
                                        <th>주문번호</th>
                                        <th>배송방법</th>
                                        <th>택배사</th>
                                        <th>송장번호</th>
                                        <th>결과</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.rows.map((r) => (
                                        <tr key={r.line} className={`adm-prev adm-prev--${r.state}`}>
                                            <td>{r.line}</td>
                                            <td>{r.orderNo}</td>
                                            <td>{r.method}</td>
                                            <td>{r.carrier}</td>
                                            <td>{r.trackingNo}</td>
                                            <td>
                                                {STATE_LABEL[r.state]}
                                                {r.message ? <div className="adm-muted">{r.message}</div> : null}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {preview.summary.already > 0 ? (
                            <label className="adm-excel__check">
                                <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                                <span>이미 송장이 등록된 {preview.summary.already}건도 덮어쓰기</span>
                            </label>
                        ) : null}
                        <div className="adm-modal__actions">
                            {preview.summary.error > 0 ? (
                                <button type="button" className="adm-btn" onClick={downloadErrors}>
                                    오류 목록 엑셀 받기
                                </button>
                            ) : null}
                            <span style={{ flex: 1 }} />
                            <button
                                type="button"
                                className="adm-btn"
                                onClick={() => {
                                    setPreview(null);
                                    setFile(null);
                                }}
                            >
                                닫기
                            </button>
                            <button type="button" className="adm-btn adm-btn--primary" onClick={commit} disabled={busy || applicable === 0}>
                                {busy ? '등록 중...' : `정상 건만 등록 (${applicable}건)`}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
