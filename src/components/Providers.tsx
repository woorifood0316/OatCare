'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { CartProvider } from './cart/CartProvider';
import { CartFab } from './cart/CartFab';
import { PageTracker } from './PageTracker';
import { RefCapture } from './share/RefCapture';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <CartProvider>
                {children}
                <CartFab />
                <PageTracker />
                <RefCapture />
            </CartProvider>
        </SessionProvider>
    );
}
