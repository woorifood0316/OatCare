'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { FLAVORS, MIX_UNIT, evenMix, getItem, mixError, type CartLine } from '../../lib/catalog';

/** Package colour per flavour, used to paint the 5-pack cells of the mix bar. */
const FLAVOR_COLOR: Record<string, string> = {
    그레인: '#D4A23A',
    고구마: '#9A5BA0',
    단백질: '#C8473C',
    서리태: '#2E2A28',
    초코: '#6B3E26',
};

/**
 * "20개 채우기" bar for a set's flavour mix: one cell per 5-pack, painted in the colour of the flavour in it, so the
 * visitor sees at a glance how full the box is and what is in it.
 */
export function MixBar({ count, detail }: { count: number; detail: Record<string, number> }) {
    const cells = count / MIX_UNIT;
    const filled = FLAVORS.flatMap((f) => Array.from({ length: Math.floor((detail[f] ?? 0) / MIX_UNIT) }, () => f));
    const total = filled.length * MIX_UNIT;
    const left = count - total;
    return (
        <div className="mixbar" aria-label={`${count}개 중 ${total}개 선택`}>
            <p className="mixbar__head">
                📦 {count}개 채우기 <b>{total}개 / {count}개</b>
            </p>
            <div className="mixbar__cells" style={{ gridTemplateColumns: `repeat(${cells}, 1fr)` }}>
                {Array.from({ length: cells }, (_, i) => {
                    const f = filled[i];
                    return (
                        <span key={i} className={f ? 'is-on' : ''} style={f ? { background: FLAVOR_COLOR[f] ?? 'var(--oc-gold)' } : undefined}>
                            {f ?? ''}
                        </span>
                    );
                })}
            </div>
            <p className={`mixbar__foot${left === 0 ? ' is-done' : ''}`}>
                {left > 0 ? (
                    <>
                        <b>{left / MIX_UNIT}묶음({left}개)</b> 더 담아주세요 · 같은 맛을 또 담아도 돼요
                    </>
                ) : (
                    '맛 구성이 완료됐어요 ✓'
                )}
            </p>
        </div>
    );
}

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
                        원하는 맛만 골라 <b>{MIX_UNIT}개 단위</b>로 담아 <b>총 {count}개</b>를 채워 주세요. 안 고른 맛은 빠져요.
                    </p>
                    <MixBar count={count} detail={detail} />
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
                </div>
            ) : (
                <p className="cart-mix__hint">{FLAVORS.map((f) => `${f} ${evenMix(count)[f]}`).join(' · ')}</p>
            )}
        </div>
    ) : null;

    return { mixable, mixChoice, mixErr, picker };
}
