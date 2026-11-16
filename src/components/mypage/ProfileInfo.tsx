'use client';

import React, { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { NAME_MAX, formatPhone } from '../../lib/profile-rules';

type Field = 'name' | 'phone' | 'email';

const PROVIDER_KO: Record<string, string> = { kakao: '카카오', naver: '네이버', google: '구글' };

/**
 * 회원 정보 with changes in place. Name and phone need a login from the last 10 minutes (otherwise the member is
 * asked to sign in again with their own social login, then comes back here with the box open); the email is
 * changed with a code sent to the new address.
 */
export function ProfileInfo(props: {
    name: string | null;
    nameEdited: boolean;
    phone: string | null;
    email: string | null;
    joined: string;
    fresh: boolean;
    provider: string | null;
}) {
    const [name, setName] = useState(props.name ?? '');
    const [nameEdited, setNameEdited] = useState(props.nameEdited);
    const [phone, setPhone] = useState(props.phone ?? '');
    const [email, setEmail] = useState(props.email ?? '');
    const [open, setOpen] = useState<Field | null>(null);
    const [draft, setDraft] = useState('');
    const [code, setCode] = useState('');
    const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState('');
    const via = props.provider ? PROVIDER_KO[props.provider] : null;

    const start = (f: Field) => {
        setOpen(f);
        setError('');
        setDone('');
        setCode('');
        setCodeSentTo(null);
        setDraft(f === 'name' ? name : f === 'phone' ? phone : '');
    };

    // back from the identity check: open the box the member was about to change
    useEffect(() => {
        const f = new URLSearchParams(window.location.search).get('edit');
        if (f === 'name' || f === 'phone') {
            start(f);
            window.history.replaceState(null, '', window.location.pathname);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const reauth = (f: Field) => {
        const back = `/mypage/profile?edit=${f}`;
        signOut({ redirectTo: `/login?callbackUrl=${encodeURIComponent(back)}&notice=reauth${props.provider ? `&via=${props.provider}` : ''}` });
    };

    const post = async (url: string, body: unknown) => {
        setBusy(true);
        setError('');
        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const d = (await res.json().catch(() => ({}))) as Record<string, string | boolean>;
            if (!res.ok) {
                if (d.reauth) setError('reauth');
                else setError((d.error as string) ?? '저장하지 못했어요. 다시 시도해 주세요.');
                return null;
            }
            return d;
        } catch {
            setError('연결이 원활하지 않아요. 다시 시도해 주세요.');
            return null;
        } finally {
            setBusy(false);
        }
    };

    const save = async () => {
        if (open === 'name' || open === 'phone') {
            const d = await post('/api/account/profile', { field: open, value: draft });
            if (!d) return;
            if (open === 'name') {
                setName(d.name as string);
                setNameEdited(true);
            } else setPhone(d.phone as string);
            setDone(open === 'name' ? '이름을 바꿨어요.' : '전화번호를 저장했어요.');
            setOpen(null);
        }
    };

    const sendCode = async () => {
        const d = await post('/api/account/email', { action: 'send', email: draft });
        if (d) {
            setCodeSentTo(d.email as string);
            setCode('');
        }
    };
    const verify = async () => {
        const d = await post('/api/account/email', { action: 'verify', code });
        if (!d) return;
        setEmail(d.email as string);
        setDone('이메일을 바꿨어요. 이제 주문·배송 메일이 이 주소로 가요.');
        setOpen(null);
    };

    const needsCheck = (open === 'name' || open === 'phone') && (!props.fresh || error === 'reauth');

    const editor = (f: Field) => {
        if (open !== f) return null;
        if (needsCheck) {
            return (
                <div className="pf-edit pf-edit--check">
                    <p>
                        개인정보 보호를 위해 {f === 'name' ? '이름' : '전화번호'}을 바꾸기 전에 본인 확인을 해요. {via ? `${via}로` : '가입한 방법으로'} 다시 로그인하면 이 화면으로 돌아와 바로 수정할 수 있어요.
                    </p>
                    <div className="pf-edit__actions">
                        <button type="button" className="my-btn addr-btn addr-btn--ghost" onClick={() => setOpen(null)}>
                            취소
                        </button>
                        <button type="button" className="my-btn my-btn--primary" onClick={() => reauth(f)}>
                            {via ? `${via}로 본인 확인` : '다시 로그인'}
                        </button>
                    </div>
                </div>
            );
        }
        if (f === 'email') {
            return (
                <div className="pf-edit">
                    <label className="pf-edit__label">
                        새 이메일
                        <input type="email" inputMode="email" autoComplete="email" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="example@email.com" disabled={busy} />
                    </label>
                    {codeSentTo ? (
                        <label className="pf-edit__label">
                            <span>
                                <b>{codeSentTo}</b>로 보낸 인증번호 6자리 (10분 안에 입력)
                            </span>
                            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" disabled={busy} />
                        </label>
                    ) : null}
                    {error && error !== 'reauth' ? <p className="my-error">{error}</p> : null}
                    <div className="pf-edit__actions">
                        <button type="button" className="my-btn addr-btn addr-btn--ghost" onClick={() => setOpen(null)} disabled={busy}>
                            취소
                        </button>
                        {codeSentTo ? (
                            <>
                                <button type="button" className="my-btn addr-btn addr-btn--ghost" onClick={sendCode} disabled={busy}>
                                    다시 받기
                                </button>
                                <button type="button" className="my-btn my-btn--primary" onClick={verify} disabled={busy || code.length !== 6}>
                                    확인
                                </button>
                            </>
                        ) : (
                            <button type="button" className="my-btn my-btn--primary" onClick={sendCode} disabled={busy || !draft.trim()}>
                                {busy ? '보내는 중...' : '인증번호 받기'}
                            </button>
                        )}
                    </div>
                </div>
            );
        }
        return (
            <div className="pf-edit">
                {f === 'name' ? (
                    <input value={draft} maxLength={NAME_MAX} onChange={(e) => setDraft(e.target.value)} placeholder="이름" autoComplete="name" disabled={busy} aria-label="이름" />
                ) : (
                    <input
                        value={draft}
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={13}
                        onChange={(e) => setDraft(formatPhone(e.target.value))}
                        placeholder="010-1234-5678"
                        disabled={busy}
                        aria-label="전화번호"
                    />
                )}
                {error && error !== 'reauth' ? <p className="my-error">{error}</p> : null}
                <div className="pf-edit__actions">
                    <button type="button" className="my-btn addr-btn addr-btn--ghost" onClick={() => setOpen(null)} disabled={busy}>
                        취소
                    </button>
                    <button type="button" className="my-btn my-btn--primary" onClick={save} disabled={busy || !draft.trim()}>
                        {busy ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        );
    };

    const row = (f: Field, label: string, value: React.ReactNode, action: string) => (
        <div className="pf-row">
            <div className="pf-row__main">
                <dt>{label}</dt>
                <dd>{value}</dd>
                {open !== f ? (
                    <button type="button" className="pf-row__btn" onClick={() => start(f)}>
                        {action}
                    </button>
                ) : null}
            </div>
            {editor(f)}
        </div>
    );

    return (
        <>
            {done ? (
                <p className="pf-done" role="status">
                    {done}
                </p>
            ) : null}
            <dl className="pf-list">
                {row(
                    'name',
                    '이름',
                    <>
                        {name || '-'}
                        {!nameEdited ? <small className="pf-hint">SNS 닉네임을 그대로 가져왔어요. 이름을 확인해 주세요.</small> : null}
                    </>,
                    '수정',
                )}
                {row('phone', '전화번호', phone || <span className="pf-empty">등록된 번호가 없어요</span>, phone ? '수정' : '등록')}
                {row(
                    'email',
                    '이메일',
                    email ? (
                        <>
                            {email.split('@')[0]}
                            <wbr />@{email.split('@').slice(1).join('@')}
                        </>
                    ) : (
                        <span className="pf-empty pf-empty--warn">등록된 이메일이 없어 주문·배송 메일을 받을 수 없어요</span>
                    ),
                    email ? '변경' : '등록',
                )}
                <div className="pf-row">
                    <div className="pf-row__main">
                        <dt>가입일</dt>
                        <dd>{props.joined}</dd>
                    </div>
                </div>
            </dl>
        </>
    );
}
