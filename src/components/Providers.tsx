'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { CartProvider } from './cart/CartProvider';
import { CartFab } from './cart/CartFab';
import { PageTracker } from './PageTracker';
import { RefCapture } from './share/RefCapture';
import { AppInstallHost } from './app/AppInstallHost';
import { LineBreakGuard } from './LineBreakGuard';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <CartProvider>
                {children}
                <CartFab />
                <PageTracker />
                <RefCapture />
                <AppInstallHost />
                <LineBreakGuard />
            </CartProvider>
        </SessionProvider>
    );
}
