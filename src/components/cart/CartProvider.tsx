'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    CYCLE_OPTIONS,
    CartLine,
    getItem,
    lineKey,
    maxQty,
} from '../../lib/catalog';

const STORAGE_KEY = 'oc_cart_v1';

interface CartContextValue {
    lines: CartLine[];
    /** Total quantity across all lines. */
    count: number;
    hydrated: boolean;
    toast: string;
    addLine: (line: CartLine) => void;
    setQty: (key: string, qty: number) => void;
    setCycle: (key: string, cycleDays: number) => void;
    removeLine: (key: string) => void;
    clearMode: (mode: CartLine['mode']) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function sanitize(raw: unknown): CartLine[] {
    if (!Array.isArray(raw)) return [];
    const out: CartLine[] = [];
    for (const r of raw) {
        if (!r || typeof r !== 'object') continue;
        const { sku, qty, mode, cycleDays, mix } = r as Record<string, unknown>;
        if (typeof sku !== 'string') continue;
        const item = getItem(sku);
        if (!item) continue;
        if (mode !== 'once' && mode !== 'subscribe') continue;
        if (mode === 'subscribe' && !item.subscribable) continue;
        const q = Math.max(1, Math.min(maxQty(mode), Math.floor(Number(qty)) || 1));
        const line: CartLine = { sku, qty: q, mode };
        if (mode === 'subscribe') {
            line.cycleDays = CYCLE_OPTIONS.includes(Number(cycleDays)) ? Number(cycleDays) : item.count;
        }
        if (item.kind === 'bundle') line.mix = mix === 'custom' ? 'custom' : 'all';
        out.push(line);
    }
    return out;
}

function merge(lines: CartLine[], incoming: CartLine): CartLine[] {
    const key = lineKey(incoming);
    const found = lines.find((l) => lineKey(l) === key);
    if (!found) return [...lines, { ...incoming, qty: Math.min(incoming.qty, maxQty(incoming.mode)) }];
    return lines.map((l) =>
        lineKey(l) === key ? { ...l, qty: Math.min(l.qty + incoming.qty, maxQty(l.mode)) } : l,
    );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [lines, setLines] = useState<CartLine[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [toast, setToast] = useState('');
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load once on the client (localStorage may be blocked, so always guard).
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) setLines(sanitize(JSON.parse(raw)));
        } catch {
            /* ignore */
        }
        setHydrated(true);

        const onStorage = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEY) return;
            try {
                setLines(e.newValue ? sanitize(JSON.parse(e.newValue)) : []);
            } catch {
                /* ignore */
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
        } catch {
            /* ignore */
        }
    }, [lines, hydrated]);

    const showToast = useCallback((text: string) => {
        setToast(text);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(''), 3200);
    }, []);

    const addLine = useCallback(
        (line: CartLine) => {
            setLines((prev) => merge(prev, line));
            const name = getItem(line.sku)?.name ?? '상품';
            showToast(`${name}을(를) 장바구니에 담았어요`);
        },
        [showToast],
    );

    const setQty = useCallback((key: string, qty: number) => {
        setLines((prev) =>
            prev.map((l) =>
                lineKey(l) === key ? { ...l, qty: Math.max(1, Math.min(maxQty(l.mode), Math.floor(qty) || 1)) } : l,
            ),
        );
    }, []);

    const setCycle = useCallback((key: string, cycleDays: number) => {
        setLines((prev) => {
            const target = prev.find((l) => lineKey(l) === key);
            if (!target || !CYCLE_OPTIONS.includes(cycleDays)) return prev;
            // Changing the cycle can collide with an existing identical line, so rebuild via merge.
            const rest = prev.filter((l) => lineKey(l) !== key);
            return merge(rest, { ...target, cycleDays });
        });
    }, []);

    const removeLine = useCallback((key: string) => {
        setLines((prev) => prev.filter((l) => lineKey(l) !== key));
    }, []);

    const clearMode = useCallback((mode: CartLine['mode']) => {
        setLines((prev) => prev.filter((l) => l.mode !== mode));
    }, []);

    const value = useMemo<CartContextValue>(
        () => ({
            lines,
            count: lines.reduce((sum, l) => sum + l.qty, 0),
            hydrated,
            toast,
            addLine,
            setQty,
            setCycle,
            removeLine,
            clearMode,
        }),
        [lines, hydrated, toast, addLine, setQty, setCycle, removeLine, clearMode],
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}
