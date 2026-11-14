'use client';

import React, { useCallback, useEffect, useState } from 'react';

/**
 * Index of the card nearest the centre of a horizontally scrolling row (phones), and a way to scroll to one.
 * On wide screens the row is a normal grid (not scrollable), so the index simply stays where it is.
 */
export function useSwipeIndex(ref: React.RefObject<HTMLElement | null>, initial = 0) {
    const [index, setIndex] = useState(initial);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        let raf = 0;
        const update = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                if (el.scrollWidth <= el.clientWidth + 2) return;
                const mid = el.scrollLeft + el.clientWidth / 2;
                let best = 0;
                let bestDist = Infinity;
                [...el.children].forEach((c, i) => {
                    const child = c as HTMLElement;
                    const d = Math.abs(child.offsetLeft + child.offsetWidth / 2 - mid);
                    if (d < bestDist) {
                        bestDist = d;
                        best = i;
                    }
                });
                setIndex(best);
            });
        };
        el.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        return () => {
            cancelAnimationFrame(raf);
            el.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [ref]);

    const scrollToIndex = useCallback(
        (i: number, smooth = true) => {
            const el = ref.current;
            const child = el?.children[i] as HTMLElement | undefined;
            if (!el || !child || el.scrollWidth <= el.clientWidth + 2) return;
            el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
            setIndex(i);
        },
        [ref],
    );

    return [index, scrollToIndex] as const;
}

/** Position dots under a swipe row (shown on phones only, via CSS). Tapping a dot moves to that card. */
export function SwipeDots({ count, index, onSelect, label }: { count: number; index: number; onSelect: (i: number) => void; label: string }) {
    return (
        <div className="oc-swipe-dots" role="tablist" aria-label={label}>
            {Array.from({ length: count }, (_, i) => (
                <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`${i + 1}번째`}
                    className={i === index ? 'is-active' : ''}
                    onClick={() => onSelect(i)}
                />
            ))}
        </div>
    );
}
