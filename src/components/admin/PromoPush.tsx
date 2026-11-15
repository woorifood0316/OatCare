'use client';

import React, { useEffect, useState } from 'react';

type Promo = { id: string; createdAt: string; title: string; body: string; sendAfter: string; total: number; sent: number; waiting: number; skipped: number; failed: number };
type State = { audience: number; night: boolean; promos: Promo[] };

const TITLE_MAX = 40;
const BODY_MAX = 120;
const OPT_OUT = '수신 거부: 마이페이지 › 내 정보 › 이벤트·혜택 알림';

const when = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

/** 관리자 › 이벤트 알림: write, preview, send (rules applied automatically), and the history. */
export function PromoPush() {
    const [data, setData] = useState<State | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [url, setUrl] = useState('/');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const load = () =>
        fetch('/api/admin/push', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: State | null) => d && setData(d));
    useEffect(() => {
        load();
    }, []);

    const send = async () => {
        if (busy || !data) return;
        const ask = data.night
            ? `지금은 밤(21시~8시)이라 내일 아침 8시에 ${data.audience}명에게 보내요. 예약할까요?`
            : `이벤트·혜택 알림에 동의하고 앱 알림을 켠 ${data.audience}명에게 지금 보낼까요?`;
        if (!window.confirm(ask)) return;
        setBusy(true);
        setMsg(null);
        try {
            const res = await fetch('/api/admin/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body, url }) });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((d.error as string) ?? '보내지 못했어요');
            setMsg({ ok: true, text: data.night ? `${d.recipients}명에게 내일 아침 8시에 보내도록 예약했어요.` : `${d.recipients}명에게 보내는 중이에요. 몇 분 안에 도착해요.` });
            setTitle('');
            setBody('');
            load();
        } catch (e) {
            setMsg({ ok: false, text: (e as Error).message });
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <section className="adm-card promo">
                <div className="promo__form">
                    <label>
                        <span>
                            제목 <small>({title.length}/{TITLE_MAX}) · 앞에 (광고)가 자동으로 붙어요</small>
                        </span>
                        <input value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="예: 초코맛 3,000원 할인 쿠폰이 곧 사라져요" />
                    </label>
                    <label>
                        <span>
                            내용 <small>({body.length}/{BODY_MAX}) · 끝에 수신 거부 안내가 자동으로 붙어요</small>
                        </span>
                        <textarea value={body} maxLength={BODY_MAX} rows={3} onChange={(e) => setBody(e.target.value)} placeholder="예: 이번 주 일요일까지 쿠폰함의 쿠폰을 쓰면 더 저렴해요" />
                    </label>
                    <label>
                        <span>
                            누르면 열릴 페이지 <small>(예: / · /sets/20 · /products/choco · /mypage/coupons)</small>
                        </span>
                        <input value={url} onChange={(e) => setUrl(e.target.value)} />
                    </label>
                    <p className="adm-muted">
                        받는 사람: <b>{data ? `${data.audience}명` : '…'}</b> (이벤트·혜택 알림에 동의하고 앱 알림을 켠 회원)
                        {data?.night ? <> · 지금은 밤이라 <b>내일 아침 8시</b>에 보내져요</> : null}
                    </p>
                    {msg ? <p className={msg.ok ? 'promo__ok' : 'my-error'}>{msg.text}</p> : null}
                    <button type="button" className="adm-btn adm-btn--primary" onClick={send} disabled={busy || !title.trim() || !body.trim() || !data || data.audience === 0}>
                        {busy ? '보내는 중...' : data?.night ? '아침 8시에 보내기 (예약)' : '보내기'}
                    </button>
                </div>
                <div className="promo__preview" aria-label="미리보기">
                    <span className="promo__label">휴대폰에 이렇게 보여요</span>
                    <div className="promo__note">
                        <img src="/icon-192.png" alt="" />
                        <div>
                            <b>(광고) {title || '제목'}</b>
                            <span>{body || '내용'}</span>
                            <small>{OPT_OUT}</small>
                        </div>
                    </div>
                </div>
            </section>

            <h2 className="adm-h2">보낸 이벤트 알림</h2>
            {!data || data.promos.length === 0 ? (
                <p className="adm-muted">아직 보낸 이벤트 알림이 없어요.</p>
            ) : (
                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr>
                                <th>작성</th>
                                <th>보내는 시각</th>
                                <th>제목</th>
                                <th className="r">대상</th>
                                <th className="r">도착</th>
                                <th className="r">대기</th>
                                <th className="r">제외·실패</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.promos.map((p) => (
                                <tr key={p.id}>
                                    <td>{when(p.createdAt)}</td>
                                    <td>{when(p.sendAfter)}</td>
                                    <td title={p.body}>(광고) {p.title}</td>
                                    <td className="r">{p.total}</td>
                                    <td className="r">{p.sent}</td>
                                    <td className="r">{p.waiting}</td>
                                    <td className="r">{p.skipped + p.failed}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="adm-muted">
                · 밤 9시~아침 8시에는 보내지 않아요(그 사이에 쓴 알림은 아침 8시에 나가요). · 보내기 직전에 동의를 다시 확인해서, 그 사이 동의를 끈 회원에게는
                가지 않아요(제외). · 주문·배송 알림은 여기서 보내지 않고 자동으로 나가요.
            </p>
        </>
    );
}
