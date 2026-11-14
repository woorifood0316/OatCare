'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { CartProvider } from './cart/CartProvider';
import { CartFab } from './cart/CartFab';
import { PageTracker } from './PageTracker';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <CartProvider>
                {children}
                <CartFab />
                <PageTracker />
            </CartProvider>
        </SessionProvider>
    );
}
