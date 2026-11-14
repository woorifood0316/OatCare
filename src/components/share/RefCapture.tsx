'use client';

import { useEffect } from 'react';

const REF_COOKIE = 'oc_ref';
const isCode = (v: string | null): v is string => !!v && /^[A-Z2-9]{7}$/.test(v);

/** The invitation code of the link this visitor arrived through (kept for 30 days), or null. */
export function currentRefCode(): string | null {
    const m = document.cookie.match(/(?:^|;\s*)oc_ref=([A-Z2-9]{7})/);
    return m ? m[1] : null;
}

/**
 * Arrived through a member's share link (?ref=CODE): remember the code for the sign-up that may follow, and take it
 * out of the address bar so the visitor doesn't pass someone else's code on when they share the page themselves.
 */
export function RefCapture() {
    useEffect(() => {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('ref');
        if (!isCode(code)) return;
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${REF_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`;
        url.searchParams.delete('ref');
        window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }, []);
    return null;
}
