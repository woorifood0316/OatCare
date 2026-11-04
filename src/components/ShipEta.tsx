'use client';

import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { formatLeft, shipEstimate } from '../lib/ship-date';

/**
 * "언제 출발해요?" notice that follows the clock (Korea time):
 *   before 13:00 on a shipping day → "2시간 15분 안에 결제하면 오늘 출발"
 *   otherwise                      → "지금 결제하면 내일(목) 출발" / "11/9(월) 출발" (weekends·public holidays skipped)
 * Rendered only after mount (the server's clock and the visitor's page time must not disagree), refreshed every 20 s.
 */
export function ShipEta({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        setNow(new Date());
        const t = setInterval(() => setNow(new Date()), 20000);
        return () => clearInterval(t);
    }, []);

    const cls = `ship-eta${compact ? ' ship-eta--compact' : ''}${className ? ` ${className}` : ''}`;
    if (!now) return <div className={`${cls} ship-eta--wait`} aria-hidden="true" />;

    const e = shipEstimate(now);
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
