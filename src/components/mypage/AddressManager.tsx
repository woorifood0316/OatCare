'use client';

import { useConfirm } from '../ui/ConfirmDialog';
import React, { useState } from 'react';
import { MapPin, Pencil, Trash2 } from 'lucide-react';
import { AddressForm } from '../address/AddressForm';
import type { Address, AddressInput } from '../../lib/validate';

async function call(method: string, url: string, body?: unknown): Promise<{ ok: boolean; data: { addresses?: Address[]; error?: string } }> {
    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data: { addresses?: Address[]; error?: string } = {};
    try {
        data = await res.json();
    } catch {
        /* ignore */
    }
    return { ok: res.ok, data };
}

export function AddressManager({ initial }: { initial: Address[] }) {
    const { confirm, dialog } = useConfirm();
    const [list, setList] = useState<Address[]>(initial);
    const [mode, setMode] = useState<'idle' | 'add' | { editId: string }>('idle');
    const [notice, setNotice] = useState('');

    const apply = (data: { addresses?: Address[] }) => data.addresses && setList(data.addresses);

    const add = async (input: AddressInput) => {
        const r = await call('POST', '/api/addresses', input);
        if (!r.ok) return r.data.error ?? '저장하지 못했어요';
        apply(r.data);
        setMode('idle');
        return null;
    };

    const edit = (id: string) => async (input: AddressInput) => {
        const r = await call('PATCH', `/api/addresses/${id}`, input);
        if (!r.ok) return r.data.error ?? '저장하지 못했어요';
        apply(r.data);
        setMode('idle');
        return null;
    };

    const makeDefault = async (id: string) => {
        setNotice('');
        const r = await call('PATCH', `/api/addresses/${id}`, { isDefault: true });
        if (r.ok) apply(r.data);
        else setNotice(r.data.error ?? '변경하지 못했어요');
    };

    const remove = async (id: string) => {
        if (!(await confirm({ title: '이 배송지를 삭제할까요?', body: '삭제한 배송지는 되돌릴 수 없어요.', icon: '📍', confirmLabel: '삭제', danger: true }))) return;
        setNotice('');
        const r = await call('DELETE', `/api/addresses/${id}`);
        if (r.ok) apply(r.data);
        else setNotice(r.data.error ?? '삭제하지 못했어요');
    };

    return (
        <section className="my-card">
            {dialog}
            <div className="my-card__head">
                <h2 className="my-card__title">배송지</h2>
                {mode === 'idle' ? (
                    <button type="button" className="my-link-btn" onClick={() => setMode('add')}>
                        + 새 배송지
                    </button>
                ) : null}
            </div>

            {notice ? <p className="my-error">{notice}</p> : null}

            {mode === 'add' ? (
                <AddressForm submitLabel="배송지 추가" onSubmit={add} onCancel={() => setMode('idle')} />
            ) : null}

            {list.length === 0 && mode !== 'add' ? (
                <div className="my-placeholder">
                    <MapPin size={22} />
                    <p>저장된 배송지가 없어요</p>
                    <button type="button" className="my-btn my-btn--primary" onClick={() => setMode('add')}>
                        배송지 추가하기
                    </button>
                </div>
            ) : (
                <ul className="addr-list">
                    {list.map((a) => {
                        const editing = typeof mode === 'object' && mode.editId === a.id;
                        return (
                            <li key={a.id} className="addr-item">
                                {editing ? (
                                    <AddressForm initial={a} submitLabel="수정 완료" onSubmit={edit(a.id)} onCancel={() => setMode('idle')} />
                                ) : (
                                    <>
                                        <div className="addr-item__head">
                                            <strong>{a.label || a.recipient}</strong>
                                            {a.isDefault ? <span className="my-pill is-on">기본 배송지</span> : null}
                                        </div>
                                        <p className="addr-item__line">
                                            {a.recipient} · {a.phone}
                                        </p>
                                        <p className="addr-item__line">
                                            {a.zipcode ? `(${a.zipcode}) ` : ''}
                                            {a.address1} {a.address2 ?? ''}
                                        </p>
                                        <div className="addr-item__actions">
                                            {!a.isDefault ? (
                                                <button type="button" onClick={() => makeDefault(a.id)}>
                                                    기본으로 설정
                                                </button>
                                            ) : null}
                                            <button type="button" onClick={() => setMode({ editId: a.id })}>
                                                <Pencil size={14} /> 수정
                                            </button>
                                            <button type="button" onClick={() => remove(a.id)}>
                                                <Trash2 size={14} /> 삭제
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
