'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { SIGNUP_COUPON_MAX, WELCOME_COUPON_MIN_COUNT, couponDiscount } from '../../lib/catalog';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

type CouponLite = { amount: number; minCount: number };
type CouponState = { loggedIn: boolean; coupons: CouponLite[] };

// Fetched once per page load and shared by every hint on the page.
let couponsPromise: Promise<CouponState> | null = null;
/** Start loading as soon as a page with a purchase sheet opens, so the coupon line is there when the sheet is. */
export function preloadCoupons() {
    void loadCoupons();
}
function loadCoupons(): Promise<CouponState> {
    couponsPromise ??= fetch('/api/coupons')
        .then((r) => (r.ok ? r.json() : { loggedIn: false, coupons: [] }))
        .catch(() => ({ loggedIn: false, coupons: [] }));
    return couponsPromise;
}

/**
 * Cart notice that tells the customer whether their coupon will apply to this order, and if not, how to make it
 * apply (add more, or choose a 20·30 set / subscription). Rendered after mount only.
 */
export function CouponHint({
    mode,
    count,
    noMinimum,
    total,
    oneCycle = true,
    compact = false,
    className = '',
}: {
    mode: 'once' | 'subscribe';
    /** Sachets in the order (a 20-pack counts 20). */
    count: number;
    /** The order has a 20·30 set (or is a subscription): no minimum. */
    noMinimum: boolean;
    /** Subscription cart: the amount per delivery, to show "첫 결제 X원 · 이후 매회 Y원". */
    total?: number;
    /** All subscriptions on the same cycle (otherwise the coupon only goes on the first one). */
    oneCycle?: boolean;
    /** Purchase sheet: one line under the total, saying only what really applies to this order (or what is missing). */
    compact?: boolean;
    className?: string;
}) {
    const [state, setState] = useState<CouponState | null>(null);
    useEffect(() => {
        let alive = true;
        loadCoupons().then((s) => alive && setState(s));
        return () => {
            alive = false;
        };
    }, []);
    if (!state) return null;
    if (compact) return <CompactLine state={state} mode={mode} count={count} noMinimum={noMinimum} total={total} oneCycle={oneCycle} className={className} />;

    if (!state.loggedIn) {
        return (
            <div className={`cph ${className}`}>
                <p>
                    🎟️ 회원가입하면 <b>쿠폰 최대 {won(SIGNUP_COUPON_MAX)}</b> (한 번 주문에 1장씩) · <span className="oc-nowrap">20·30개 세트·정기구독은</span> 금액 상관없이 바로 적용
                </p>
                {mode === 'subscribe' && total ? (
                    <p className="cph__sub">
                        정기구독은 <b>매회 {won(total)}</b>이고, 쿠폰은 첫 결제에서 빠져요.
                    </p>
                ) : null}
            </div>
        );
    }
    if (state.coupons.length === 0) return null;

    const free = mode === 'subscribe' || noMinimum;
    const best = [...state.coupons].sort((a, b) => b.amount - a.amount)[0];
    const usable = state.coupons.filter((c) => couponDiscount(c, count, Number.MAX_SAFE_INTEGER, free) > 0);
    if (usable.length > 0) {
        const top = [...usable].sort((a, b) => b.amount - a.amount)[0];
        return (
            <div className={`cph is-ok ${className}`}>
                <p>
                    🎟️ <b>{won(top.amount)} 쿠폰</b>이 결제 단계에서 <b>자동 적용</b>돼요{mode === 'subscribe' ? ' (첫 결제)' : ''}
                </p>
                {mode === 'subscribe' && total && oneCycle && total > top.amount ? (
                    <p className="cph__sub">
                        <span className="oc-nowrap">
                            첫 결제 <b>{won(total - top.amount)}</b>
                        </span>{' · '}
                        <span className="oc-nowrap">
                            이후 매회 <b>{won(total)}</b>
                        </span>
                    </p>
                ) : null}
            </div>
        );
    }
    const short = best.minCount - count;
    return (
        <div className={`cph ${className}`}>
            <p>
                🎟️ <b>{won(best.amount)} 쿠폰</b>은 낱개·맛보기 세트 합계 <span className="oc-nowrap">{best.minCount}개(한 박스)부터</span> 써요 ·{' '}
                <span className="oc-nowrap">지금 {count}개</span>,{' '}
                <span className="oc-nowrap">
                    낱개 <b>{short}개</b>
                    {short % 10 === 0 ? <> (맛보기 세트 {short / 10}개)</> : null} 더 담으면 적용
                </span>
            </p>
            <p className="cph__up">
                <span>
                    <b>20·30개 세트</b>나 <b>정기구독</b>은 금액 상관없이 바로 적용돼요
                </span>
                <Link href="/sets/20">세트 보기 →</Link>
            </p>
        </div>
    );
}

/** The purchase sheet's coupon line: applied for sure, or the condition still missing - never a promise that does not hold. */
function CompactLine({
    state,
    mode,
    count,
    noMinimum,
    total,
    oneCycle,
    className,
}: {
    state: CouponState;
    mode: 'once' | 'subscribe';
    count: number;
    noMinimum: boolean;
    total?: number;
    oneCycle: boolean;
    className: string;
}) {
    const free = mode === 'subscribe' || noMinimum;
    if (!state.loggedIn) {
        return (
            <p className={`cph-line ${className}`}>
                🎟️ 가입하면 <b>쿠폰 최대 {won(SIGNUP_COUPON_MAX)}</b> (한 번 주문에 1장씩)
                {!free && count < WELCOME_COUPON_MIN_COUNT ? <> · 낱개는 <span className="oc-nowrap">{WELCOME_COUPON_MIN_COUNT}개부터 사용</span></> : null}
            </p>
        );
    }
    if (state.coupons.length === 0) return null;
    const usable = state.coupons.filter((c) => couponDiscount(c, count, Number.MAX_SAFE_INTEGER, free) > 0);
    if (usable.length > 0) {
        const top = [...usable].sort((a, b) => b.amount - a.amount)[0];
        return (
            <p className={`cph-line is-ok ${className}`}>
                🎟️ <b>{won(top.amount)} 쿠폰</b> 결제 때 자동 적용{mode === 'subscribe' ? ' (첫 결제)' : ''}
                {mode === 'subscribe' && total && oneCycle && total > top.amount ? (
                    <>
                        {' · '}
                        <span className="oc-nowrap">
                            첫 결제 <b>{won(total - top.amount)}</b>
                        </span>{' · '}
                        <span className="oc-nowrap">
                            이후 매회 <b>{won(total)}</b>
                        </span>
                    </>
                ) : null}
            </p>
        );
    }
    const best = [...state.coupons].sort((a, b) => b.amount - a.amount)[0];
    return (
        <p className={`cph-line ${className}`}>
            🎟️ {won(best.amount)} 쿠폰은 <span className="oc-nowrap">{best.minCount}개부터 사용 가능</span> ·{' '}
            <span className="oc-nowrap">
                <b>{best.minCount - count}개</b> 더 담으면 적용
            </span>
        </p>
    );
}
