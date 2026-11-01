// "Go back to exactly where I was": remember the landing page's scroll position (and an open quick-purchase drawer)
// before the visitor leaves for a product page, and restore it when they come back.

const KEY = 'oc_return_v2';
const MAX_AGE_MS = 30 * 60 * 1000;

export interface ReturnPoint {
    path: string;
    y: number;
    drawer?: { tab: 'single' | 'bundle' };
    at: number;
}

/** Current scroll offset. While a drawer/modal is open the page is scroll-locked (body fixed), so read the real offset. */
export function currentScrollY(): number {
    const body = document.body;
    if (body.style.position === 'fixed') {
        const top = parseInt(body.style.top || '0', 10);
        if (!Number.isNaN(top)) return -top;
    }
    return window.scrollY;
}

export function rememberReturnPoint(opts: { drawer?: { tab: 'single' | 'bundle' } } = {}) {
    try {
        const point: ReturnPoint = { path: window.location.pathname, y: Math.max(0, Math.round(currentScrollY())), drawer: opts.drawer, at: Date.now() };
        sessionStorage.setItem(KEY, JSON.stringify(point));
    } catch {
        /* storage may be blocked; going back then simply lands at the top */
    }
}

function read(): ReturnPoint | null {
    try {
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return null;
        const p = JSON.parse(raw) as ReturnPoint;
        return p && Date.now() - p.at < MAX_AGE_MS ? p : null;
    } catch {
        return null;
    }
}

/** Is there a saved place to go back to? (does not consume it) */
export function hasReturnPoint(path = '/'): boolean {
    return read()?.path === path;
}

/** Read and remove the saved place for this page. */
export function takeReturnPoint(path = '/'): ReturnPoint | null {
    const p = read();
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        /* ignore */
    }
    return p && p.path === path ? p : null;
}

/** Scroll to y even though the page may still be growing (images/videos load); gives up after ~2s. */
export function restoreScroll(y: number, done?: () => void) {
    const started = Date.now();
    const tick = () => {
        window.scrollTo({ top: y, left: 0, behavior: 'instant' as ScrollBehavior });
        const reached = Math.abs(window.scrollY - y) < 8;
        if (reached && Date.now() - started > 300) return done?.();
        if (Date.now() - started > 2000) return done?.();
        setTimeout(tick, 120);
    };
    tick();
}
