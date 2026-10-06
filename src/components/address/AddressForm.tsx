'use client';

import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { AddressInput } from '../../lib/validate';

declare global {
    interface Window {
        daum?: {
            Postcode: new (opts: {
                oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string; userSelectedType: string; buildingName?: string; apartment?: string }) => void;
                width?: string;
                height?: string;
            }) => { embed: (el: HTMLElement) => void };
        };
    }
}

const POSTCODE_SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

function loadPostcode(): Promise<void> {
    if (window.daum?.Postcode) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${POSTCODE_SRC}"]`);
        const script = existing ?? document.createElement('script');
        script.addEventListener('load', () => resolve(), { once: true });
        script.addEventListener('error', () => reject(new Error('postcode')), { once: true });
        if (!existing) {
            script.src = POSTCODE_SRC;
            script.async = true;
            document.head.appendChild(script);
        }
    });
}

export const EMPTY_ADDRESS: AddressInput = {
    label: '',
    recipient: '',
    phone: '',
    zipcode: '',
    address1: '',
    address2: '',
    isDefault: false,
} as unknown as AddressInput;

export function AddressForm({
    initial,
    submitLabel = '저장하기',
    showDefault = true,
    onSubmit,
    onCancel,
}: {
    initial?: Partial<AddressInput>;
    submitLabel?: string;
    showDefault?: boolean;
    onSubmit: (input: AddressInput) => Promise<string | null>;
    onCancel?: () => void;
}) {
    const [form, setForm] = useState({
        label: initial?.label ?? '',
        recipient: initial?.recipient ?? '',
        phone: initial?.phone ?? '',
        zipcode: initial?.zipcode ?? '',
        address1: initial?.address1 ?? '',
        address2: initial?.address2 ?? '',
        isDefault: initial?.isDefault ?? false,
    });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [searching, setSearching] = useState(false);
    const layerRef = useRef<HTMLDivElement>(null);

    const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

    const openSearch = async () => {
        setError('');
        setSearching(true);
        try {
            await loadPostcode();
            // wait a tick so the overlay container exists
            requestAnimationFrame(() => {
                if (!layerRef.current || !window.daum) return;
                layerRef.current.innerHTML = '';
                new window.daum.Postcode({
                    width: '100%',
                    height: '100%',
                    oncomplete: (data) => {
                        let extra = '';
                        if (data.userSelectedType === 'R' && data.buildingName) extra = ` (${data.buildingName})`;
                        set({
                            zipcode: data.zonecode,
                            address1: (data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress) + extra,
                        });
                        setSearching(false);
                    },
                }).embed(layerRef.current);
            });
        } catch {
            setSearching(false);
            setError('주소 검색을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
        }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        const msg = await onSubmit({
            label: form.label.trim() || null,
            recipient: form.recipient.trim(),
            phone: form.phone.trim(),
            zipcode: form.zipcode || null,
            address1: form.address1.trim(),
            address2: form.address2.trim() || null,
            isDefault: form.isDefault,
        });
        if (msg) setError(msg);
        setBusy(false);
    };

    return (
        <form className="addr-form" onSubmit={submit} noValidate>
            <label className="addr-field">
                <span>배송지 이름 (선택)</span>
                <input value={form.label} onChange={(e) => set({ label: e.target.value })} maxLength={20} placeholder="예: 집, 회사" />
            </label>
            <label className="addr-field">
                <span>받는 분</span>
                <input value={form.recipient} onChange={(e) => set({ recipient: e.target.value })} maxLength={30} autoComplete="name" required />
            </label>
            <label className="addr-field">
                <span>연락처</span>
                <input
                    value={form.phone}
                    onChange={(e) => set({ phone: e.target.value })}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="010-0000-0000"
                    maxLength={13}
                    required
                />
            </label>
            <div className="addr-field">
                <span>주소</span>
                <div className="addr-search">
                    <input value={form.zipcode} readOnly placeholder="우편번호" aria-label="우편번호" />
                    <button type="button" className="my-btn addr-btn" onClick={openSearch}>
                        주소 검색
                    </button>
                </div>
                <input value={form.address1} readOnly placeholder="주소 검색을 눌러 주세요" aria-label="기본 주소" onClick={openSearch} />
                <input
                    value={form.address2}
                    onChange={(e) => set({ address2: e.target.value })}
                    maxLength={100}
                    placeholder="상세 주소 (동·호수 등)"
                    aria-label="상세 주소"
                    autoComplete="address-line2"
                />
            </div>
            {showDefault ? (
                <label className="addr-check">
                    <input type="checkbox" checked={form.isDefault} onChange={(e) => set({ isDefault: e.target.checked })} />
                    <span>기본 배송지로 설정</span>
                </label>
            ) : null}

            {error ? (
                <p className="my-error addr-error" role="alert">
                    {error}
                </p>
            ) : null}

            <div className="addr-actions">
                {onCancel ? (
                    <button type="button" className="my-btn addr-btn addr-btn--ghost" onClick={onCancel}>
                        취소
                    </button>
                ) : null}
                <button type="submit" className="my-btn my-btn--primary" disabled={busy}>
                    {busy ? '저장 중...' : submitLabel}
                </button>
            </div>

            {searching ? (
                <div className="addr-layer" role="dialog" aria-label="주소 검색">
                    <div className="addr-layer__box">
                        <button type="button" className="addr-layer__close" onClick={() => setSearching(false)} aria-label="닫기">
                            <X size={20} />
                        </button>
                        <div ref={layerRef} className="addr-layer__body" />
                    </div>
                </div>
            ) : null}
        </form>
    );
}
