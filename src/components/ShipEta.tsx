'use client';

import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { NO_OVERRIDES, formatLeft, shipEstimate, type ShipOverrides } from '../lib/ship-date';

// The operator's days off / extra shipping days, fetched once per page load and shared by every notice.
let overridesPromise: Promise<ShipOverrides> | null = null;
function loadOverrides(): Promise<ShipOverrides> {
    overridesPromise ??= fetch('/api/ship-calendar')
        .then((r) => (r.ok ? r.json() : { closed: [], open: [] }))
        .then((j: { closed?: string[]; open?: string[] }) => ({ closed: new Set(j.closed ?? []), open: new Set(j.open ?? []) }))
        .catch(() => NO_OVERRIDES); // automatic public holidays still apply
    return overridesPromise;
}

/**
 * "언제 출발해요?" notice that follows the clock (Korea time):
 *   before 13:00 on a shipping day → "2시간 15분 안에 결제하면 오늘 출발"
 *   otherwise                      → "지금 결제하면 내일(목) 출발" / "11/9(월) 출발"
 * Weekends, public holidays (computed automatically) and the operator's days off are skipped.
 * Rendered only after mount (server and visitor clocks must not disagree), refreshed every 20 s.
 */
export function ShipEta({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
    const [now, setNow] = useState<Date | null>(null);
    const [overrides, setOverrides] = useState<ShipOverrides | null>(null);
    useEffect(() => {
        let alive = true;
        loadOverrides().then((o) => alive && setOverrides(o));
        setNow(new Date());
        const t = setInterval(() => setNow(new Date()), 20000);
        return () => {
            alive = false;
            clearInterval(t);
        };
    }, []);

    const cls = `ship-eta${compact ? ' ship-eta--compact' : ''}${className ? ` ${className}` : ''}`;
    if (!now || !overrides) return <div className={`${cls} ship-eta--wait`} aria-hidden="true" />;

    const e = shipEstimate(now, overrides);
    return (
        <div className={`${cls}${e.sameDay ? ' is-today' : ''}`} role="status">
            <p className="ship-eta__main">
                <Truck size={compact ? 15 : 17} aria-hidden="true" />
                {e.sameDay ? (
                    <span>
                        <b className="ship-eta__left">{formatLeft(e.msLeft)}</b> 안에 결제하면 <b>오늘 출발</b>
                    </span>
                ) : (
                    <span>
                        지금 결제하면 <b>{e.label} 출발</b>
                    </span>
                )}
            </p>
            {compact ? null : <p className="ship-eta__rule">평일 오후 1시까지 결제 완료 시 당일 발송 · 주말·공휴일 제외</p>}
        </div>
    );
}
