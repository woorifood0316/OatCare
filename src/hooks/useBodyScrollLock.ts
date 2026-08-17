'use client';

import { useEffect } from 'react';

/**
 * Locks background scroll while a modal/drawer/overlay is open.
 *
 * Plain `overflow: hidden` on <body> doesn't reliably stop touch-scroll
 * leaking through on iOS Safari, so this pins the body in place with
 * `position: fixed` (the standard cross-browser workaround) and restores
 * the exact scroll position on close.
 */
export function useBodyScrollLock(isLocked: boolean) {
    useEffect(() => {
        if (!isLocked) return;

        const scrollY = window.scrollY;
        const { body } = document;
        const prev = {
            position: body.style.position,
            top: body.style.top,
            left: body.style.left,
            right: body.style.right,
            width: body.style.width,
        };

        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';

        return () => {
            body.style.position = prev.position;
            body.style.top = prev.top;
            body.style.left = prev.left;
            body.style.right = prev.right;
            body.style.width = prev.width;
            // { behavior: 'instant' } overrides the global `html { scroll-behavior: smooth }`,
            // otherwise closing the modal triggers a slow animated scroll back into place.
            window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' as ScrollBehavior });
        };
    }, [isLocked]);
}
