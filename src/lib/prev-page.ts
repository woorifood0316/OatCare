// The page the visitor was on before the current one (within this tab), so "쇼핑 계속하기" can step back to it.
// Client-side navigation does not update document.referrer, so it is tracked here instead.

const KEY = 'oc_prev_page';
const CUR = 'oc_cur_page';

/** Call on every route change with the new path (+ query). */
export function trackPage(path: string) {
    try {
        const cur = sessionStorage.getItem(CUR);
        if (cur === path) return;
        if (cur) sessionStorage.setItem(KEY, cur);
        sessionStorage.setItem(CUR, path);
    } catch {
        /* storage blocked: going back then lands on the home page */
    }
}

/** Previous page in this tab, or null. */
export function previousPage(): string | null {
    try {
        return sessionStorage.getItem(KEY);
    } catch {
        return null;
    }
}

/**
 * Back-button click handler: when the visitor came from another page of this site, step back to exactly that page
 * (the browser restores it, and the home page restores its scroll position). Otherwise let the link go to its href.
 */
export function backToPrevious(e: { preventDefault: () => void }, back: () => void): boolean {
    if (previousPage() && window.history.length > 1) {
        e.preventDefault();
        back();
        return true;
    }
    return false;
}
