'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPage } from '../lib/prev-page';

/** Remembers the previous page of this tab (see lib/prev-page). Renders nothing. */
export function PageTracker() {
    const pathname = usePathname();
    useEffect(() => {
        if (pathname) trackPage(pathname);
    }, [pathname]);
    return null;
}
