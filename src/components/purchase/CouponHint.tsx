'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { WELCOME_COUPON_AMOUNT, couponDiscount } from '../../lib/catalog';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

type CouponLite = { amount: number; minOrder: number };
type CouponState = { loggedIn: boolean; coupons: CouponLite[] };

// Fetched once per page load and shared by every hint on the page.
let couponsPromise: Promise<CouponState> | null = null;
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
    subtotal,
    noMinimum,
    className = '',
}: {
    mode: 'once' | 'subscribe';
    subtotal: number;
    /** The order has a 20·30 set (or is a subscription): no minimum. */
    noMinimum: boolean;
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

    if (!state.loggedIn) {
        return (
            <div className={`cph ${className}`}>
                <p>
                    🎟️ 회원가입하면 <b>{won(WELCOME_COUPON_AMOUNT)} 쿠폰</b>을 드려요 · <span className="oc-nowrap">20·30개 세트·정기구독은</span> 금액 상관없이 바로 적용
                </p>
            </div>
        );
    }
    if (state.coupons.length === 0) return null;

    const free = mode === 'subscribe' || noMinimum;
    const best = [...state.coupons].sort((a, b) => b.amount - a.amount)[0];
    const usable = state.coupons.filter((c) => couponDiscount(c, subtotal, Number.MAX_SAFE_INTEGER, free) > 0);
    if (usable.length > 0) {
        const top = [...usable].sort((a, b) => b.amount - a.amount)[0];
        return (
            <div className={`cph is-ok ${className}`}>
                <p>
                    🎟️ <b>{won(top.amount)} 쿠폰</b>이 결제 단계에서 <b>자동 적용</b>돼요{mode === 'subscribe' ? ' (첫 결제)' : ''}
                </p>
            </div>
        );
    }
    const short = best.minOrder - subtotal;
    return (
        <div className={`cph ${className}`}>
            <p>
                🎟️ <b>{won(best.amount)} 쿠폰</b>은 낱개·맛보기 세트 <span className="oc-nowrap">{won(best.minOrder)} 이상부터</span> 써요 ·{' '}
                <span className="oc-nowrap">
                    <b>{won(short)}</b> 더 담으면 적용
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
