'use client';

import { useEffect } from 'react';

// Korean line breaking on phones: the browser may break a line
//  - before a middle dot ("카드번호 / ·유효기간", "당일 발송 / · 주말 휴무"),
//  - around an arrow ("1,000원 → / 3,000원"),
//  - after a hyphen inside a code or number ("2021- / 경기김포-3077", "L- / 이소로이신"),
//  - leaving a one- or two-letter word alone on the last line ("…초코 각 / 2포"),
// which reads as if the page were broken. This keeps those pieces together on every page, including text added
// later, by joining them with invisible no-break characters (nothing visible changes, and normal word breaks stay).
const WJ = '⁠'; // word joiner: no break here
const NBSP = ' ';

function fix(text: string): string {
    return (
        text
            // " · " separators: the dot stays at the end of the line, never at the start of the next one
            .replace(/ ·/g, `${NBSP}·`)
            // "주문·결제" compounds: no break before the dot
            .replace(/([^\s ⁠])·/g, `$1${WJ}·`)
            // "A → B": the arrow stays with both sides
            .replace(/ →/g, `${NBSP}→`)
            .replace(/→ /g, `→${NBSP}`)
            // codes and numbers with hyphens: "2021-경기김포-3077", "850-27-00983", "L-이소로이신"
            .replace(/([0-9A-Za-z가-힣])-(?=[0-9A-Za-z가-힣])/g, `$1-${WJ}`)
            // a short last word ("2포", "완성", "상품)") never sits alone on the last line: tie it to the word before
            .replace(/ ([^\s ]{1,2}[)\].,!?」]*)$/, `${NBSP}$1`)
    );
}

const SKIP = 'script, style, textarea, input, select, code, pre, [contenteditable], [data-no-linebreak-fix]';
const NEEDS_FIX = /[·→-]| [^\s ]{1,2}[)\].,!?」]*$/;

function fixNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
        const t = node.nodeValue ?? '';
        if (!NEEDS_FIX.test(t)) return;
        const el = node.parentElement;
        if (!el || el.closest(SKIP)) return;
        const f = fix(t);
        if (f !== t) node.nodeValue = f;
        return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const list: Node[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) list.push(n);
    list.forEach(fixNode);
}

/**
 * Mounted once (Providers). It must not touch text React is still hydrating (parts of a page hydrate later, inside
 * Suspense), or React reports a mismatch and re-renders. So it starts once the page has loaded and the browser is
 * idle, then follows every later change.
 */
export function LineBreakGuard() {
    useEffect(() => {
        let obs: MutationObserver | null = null;
        let cancelled = false;
        let pending: Node[] = [];
        let scheduled = false;

        const flush = () => {
            scheduled = false;
            const nodes = pending;
            pending = [];
            nodes.forEach((x) => x.isConnected && fixNode(x));
        };
        const start = () => {
            if (cancelled) return;
            fixNode(document.body);
            obs = new MutationObserver((records) => {
                for (const r of records) {
                    if (r.type === 'characterData') pending.push(r.target);
                    else r.addedNodes.forEach((x) => pending.push(x));
                }
                if (!scheduled && pending.length) {
                    scheduled = true;
                    requestAnimationFrame(flush);
                }
            });
            obs.observe(document.body, { subtree: true, childList: true, characterData: true });
        };
        const whenIdle = () => {
            const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
            if (ric) ric(() => setTimeout(start, 200), { timeout: 1500 });
            else setTimeout(start, 600);
        };

        if (document.readyState === 'complete') whenIdle();
        else window.addEventListener('load', whenIdle, { once: true });
        return () => {
            cancelled = true;
            window.removeEventListener('load', whenIdle);
            obs?.disconnect();
        };
    }, []);
    return null;
}
