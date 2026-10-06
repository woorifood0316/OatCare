'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
    CYCLE_OPTIONS,
    CartLine,
    MAX_QTY_SUBSCRIBE,
    MixOption,
    getItem,
    lineKey,
    maxQty,
    mergeCarts,
    sanitizeLines,
} from '../../lib/catalog';

const STORAGE_KEY = 'oc_cart_v1';
const OWNER_KEY = 'oc_cart_owner';

interface CartContextValue {
    lines: CartLine[];
    /** Total quantity across all lines. */
    count: number;
    hydrated: boolean;
    toast: string;
    addLine: (line: CartLine) => void;
    setQty: (key: string, qty: number) => void;
    setCycle: (key: string, cycleDays: number) => void;
    setMix: (key: string, mix: MixOption, detail?: Record<string, number>) => void;
    removeLine: (key: string) => void;
    /** Turn a one-time 20/30-pack line into a subscription line. */
    convertToSubscription: (key: string) => void;
    clearMode: (mode: CartLine['mode']) => void;
    /** Push the cart to the server right now (call before leaving for checkout). */
    flush: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

function addTo(lines: CartLine[], incoming: CartLine): CartLine[] {
    const key = lineKey(incoming);
    const found = lines.find((l) => lineKey(l) === key);
    if (!found) return [...lines, { ...incoming, qty: Math.min(incoming.qty, maxQty(incoming.mode)) }];
    return lines.map((l) =>
        lineKey(l) === key ? { ...l, qty: Math.min(l.qty + incoming.qty, maxQty(l.mode)) } : l,
    );
}

/** Forget the browser copy of the cart (used on logout so the next person on a shared device starts empty). */
export function clearLocalCart() {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(OWNER_KEY);
    } catch {
        /* ignore */
    }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const userId = session?.user?.id;

    const [lines, setLines] = useState<CartLine[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [toast, setToast] = useState('');
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const serverReady = useRef(false);
    const linesRef = useRef<CartLine[]>([]);
    linesRef.current = lines;

    // Load the browser copy once (localStorage may be blocked, so always guard).
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) setLines(sanitizeLines(JSON.parse(raw)));
        } catch {
            /* ignore */
        }
        setHydrated(true);

        const onStorage = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEY) return;
            try {
                setLines(e.newValue ? sanitizeLines(JSON.parse(e.newValue)) : []);
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

    // Logged in: the server cart is the source of truth. A guest cart (no owner yet) is merged in once.
    useEffect(() => {
        if (!hydrated) return;
        if (status === 'unauthenticated') {
            serverReady.current = false;
            return;
        }
        if (status !== 'authenticated' || !userId || serverReady.current) return;

        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/cart', { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();
                const server = sanitizeLines(data.lines);
                let owner: string | null = null;
                try {
                    owner = window.localStorage.getItem(OWNER_KEY);
                    window.localStorage.setItem(OWNER_KEY, userId);
                } catch {
                    /* ignore */
                }
                const next = owner === userId ? server : mergeCarts(server, linesRef.current);
                if (cancelled) return;
                serverReady.current = true;
                setLines(next);
            } catch {
                /* offline: keep the browser copy */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [status, userId, hydrated]);

    // Push changes to the server (debounced) once the first sync has happened.
    useEffect(() => {
        if (!serverReady.current) return;
        const t = setTimeout(() => {
            fetch('/api/cart', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lines }),
            }).catch(() => undefined);
        }, 500);
        return () => clearTimeout(t);
    }, [lines]);

    const showToast = useCallback((text: string) => {
        setToast(text);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(''), 3200);
    }, []);

    const addLine = useCallback(
        (line: CartLine) => {
            setLines((prev) => addTo(prev, line));
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
            // Changing the cycle can collide with an identical line, so rebuild via addTo.
            return addTo(
                prev.filter((l) => lineKey(l) !== key),
                { ...target, cycleDays },
            );
        });
    }, []);

    const setMix = useCallback((key: string, mix: MixOption, detail?: Record<string, number>) => {
        setLines((prev) => {
            const target = prev.find((l) => lineKey(l) === key);
            if (!target) return prev;
            const next: CartLine = { ...target, mix };
            if (mix === 'custom') next.mixDetail = detail ?? target.mixDetail ?? undefined;
            else delete next.mixDetail;
            // Keep the line in place (don't merge) while the customer is still editing the mix.
            return prev.map((l) => (lineKey(l) === key ? next : l));
        });
    }, []);

    const convertToSubscription = useCallback((key: string) => {
        setLines((prev) => {
            const target = prev.find((l) => lineKey(l) === key);
            const item = target ? getItem(target.sku) : undefined;
            if (!target || target.mode !== 'once' || !item?.subscribable) return prev;
            return addTo(
                prev.filter((l) => lineKey(l) !== key),
                { ...target, mode: 'subscribe', qty: Math.min(target.qty, MAX_QTY_SUBSCRIBE), cycleDays: item.count },
            );
        });
    }, []);

    const removeLine = useCallback((key: string) => {
        setLines((prev) => prev.filter((l) => lineKey(l) !== key));
    }, []);

    const clearMode = useCallback((mode: CartLine['mode']) => {
        setLines((prev) => prev.filter((l) => l.mode !== mode));
    }, []);

    const flush = useCallback(async () => {
        if (!serverReady.current) return;
        try {
            await fetch('/api/cart', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lines: linesRef.current }),
            });
        } catch {
            /* the debounced sync will retry */
        }
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
            setMix,
            removeLine,
            convertToSubscription,
            clearMode,
            flush,
        }),
        [lines, hydrated, toast, addLine, setQty, setCycle, setMix, removeLine, convertToSubscription, clearMode, flush],
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}
