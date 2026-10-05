'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { CartProvider } from './cart/CartProvider';
import { CartFab } from './cart/CartFab';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <CartProvider>
                {children}
                <CartFab />
            </CartProvider>
        </SessionProvider>
    );
}
