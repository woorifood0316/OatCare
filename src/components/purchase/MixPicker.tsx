'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { FLAVORS, MIX_UNIT, evenMix, getItem, mixError, type CartLine } from '../../lib/catalog';

/**
 * Flavour mix for 20·30-pack sets, shared by the set page and the quick-purchase drawer.
 * `picker` is the UI; `mixChoice` goes straight into a cart line; `mixErr` blocks buying while the mix is incomplete.
 */
export function useMixChoice(sku: string) {
    const item = getItem(sku);
    const [mode, setMode] = useState<'all' | 'custom'>('all');
    const [detail, setDetail] = useState<Record<string, number>>(() => Object.fromEntries(FLAVORS.map((f) => [f, 0])));

    // A different set starts from the even split again.
    useEffect(() => {
        setMode('all');
        setDetail(Object.fromEntries(FLAVORS.map((f) => [f, 0])));
    }, [sku]);

    const mixable = Boolean(item?.mixSelectable);
    const count = item?.count ?? 0;
    const mixChoice: Pick<CartLine, 'mix' | 'mixDetail'> =
        mixable && mode === 'custom' ? { mix: 'custom', mixDetail: detail } : { mix: 'all' };
    const total = FLAVORS.reduce((sum, f) => sum + (detail[f] ?? 0), 0);
    const mixErr = mixable && mode === 'custom' ? mixError({ sku, qty: 1, mode: 'once', ...mixChoice }) : null;
    const change = (flavor: string, delta: number) =>
        setDetail((d) => ({ ...d, [flavor]: Math.max(0, (d[flavor] ?? 0) + delta * MIX_UNIT) }));

    const picker = mixable ? (
        <div className="cart-mix pd-mix">
            <b className="pd-mix__title">맛 구성</b>
            <div className="cart-mix__modes" role="group" aria-label="맛 구성">
                <button type="button" className={mode === 'all' ? 'is-active' : ''} onClick={() => setMode('all')}>
                    5가지 골고루 (맛별 {count / FLAVORS.length}개씩)
                </button>
                <button type="button" className={mode === 'custom' ? 'is-active' : ''} onClick={() => setMode('custom')}>
                    맛 직접 고르기
                </button>
            </div>
            {mode === 'custom' ? (
                <div className="pd-pick">
                    <p className="pd-pick__guide">
                        맛마다 <b>+</b>를 눌러 {MIX_UNIT}개입을 담아요 · 총 {count / MIX_UNIT}묶음 중 <b>{total / MIX_UNIT}</b>묶음 선택
                    </p>
                    {total < count ? (
                        <p className="pd-pick__remain">
                            {(count - total) / MIX_UNIT}묶음({count - total}개) 더 담아주세요 · 같은 맛을 또 담아도 돼요
                        </p>
                    ) : null}
                    <div className="pd-pick__grid">
                        {FLAVORS.map((f) => {
                            const units = (detail[f] ?? 0) / MIX_UNIT;
                            const full = total >= count;
                            return (
                                <div key={f} className={`pd-pick__item${units > 0 ? ' is-on' : ''}`}>
                                    <b>{f}</b>
                                    <span>{units > 0 ? `${units * MIX_UNIT}개` : `${MIX_UNIT}개입 단위`}</span>
                                    <div className="pd-pick__ctl">
                                        <button type="button" onClick={() => change(f, -1)} disabled={units <= 0} aria-label={`${f} ${MIX_UNIT}개 빼기`}>
                                            <Minus size={15} />
                                        </button>
                                        <em>{units}</em>
                                        <button type="button" onClick={() => change(f, 1)} disabled={full} aria-label={`${f} ${MIX_UNIT}개 추가`}>
                                            <Plus size={15} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <p className={`cart-mix__sum${mixErr ? ' is-error' : ' is-ok'}`}>
                        {mixErr ?? `총 ${total}개 · 맛 구성이 완료됐어요`}
                    </p>
                </div>
            ) : (
                <p className="cart-mix__hint">{FLAVORS.map((f) => `${f} ${evenMix(count)[f]}`).join(' · ')}</p>
            )}
        </div>
    ) : null;

    return { mixable, mixChoice, mixErr, picker };
}
