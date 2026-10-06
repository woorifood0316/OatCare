'use client';

import React, { useState } from 'react';
import { CreditCard, Trash2 } from 'lucide-react';
import { CardRegistrar } from '../billing/CardRegistrar';
import type { PaymentMethod } from '../../lib/payment-methods';

export function cardText(m: Pick<PaymentMethod, 'cardCompany' | 'cardNumber'>) {
    return `${m.cardCompany ?? '카드'} ${(m.cardNumber ?? '').replace(/\*/g, '•')}`.trim();
}

export function PaymentMethodManager({ initial }: { initial: PaymentMethod[] }) {
    const [list, setList] = useState(initial);
    const [notice, setNotice] = useState('');

    const call = async (method: 'PATCH' | 'DELETE', id: string, body?: unknown) => {
        setNotice('');
        const res = await fetch(`/api/payment-methods/${id}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) setList(data.methods as PaymentMethod[]);
        else setNotice((data.error as string) ?? '처리하지 못했어요');
    };

    return (
        <section className="my-card">
            <div className="my-card__head">
                <h2 className="my-card__title">결제수단 (정기결제 카드)</h2>
                <CardRegistrar next="/mypage/payment" />
            </div>
            {notice ? <p className="my-error">{notice}</p> : null}

            {list.length === 0 ? (
                <div className="my-placeholder">
                    <CreditCard size={22} />
                    <p>등록된 카드가 없어요</p>
                    <CardRegistrar next="/mypage/payment" label="카드 등록하기" className="my-btn my-btn--primary" />
                </div>
            ) : (
                <ul className="addr-list">
                    {list.map((m) => (
                        <li key={m.id} className="addr-item">
                            <div className="addr-item__head">
                                <strong>{cardText(m)}</strong>
                                {m.isDefault ? <span className="my-pill is-on">기본 카드</span> : null}
                            </div>
                            <div className="addr-item__actions">
                                {!m.isDefault ? (
                                    <button type="button" onClick={() => call('PATCH', m.id, { isDefault: true })}>
                                        기본으로 설정
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm('이 카드를 삭제할까요?')) call('DELETE', m.id);
                                    }}
                                >
                                    <Trash2 size={14} /> 삭제
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <p className="cart-note" style={{ textAlign: 'left' }}>
                카드 번호는 저장하지 않으며, 토스페이먼츠가 발급한 결제 키만 암호화해서 보관해요.
            </p>
        </section>
    );
}
