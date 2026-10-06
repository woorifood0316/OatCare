'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import { clearLocalCart } from './cart/CartProvider';

// Client-side sign-out does a full page navigation, so the header's session state refreshes.
export function LogoutButton({ className = 'oc-auth__btn oc-auth__btn--plain' }: { className?: string }) {
    return (
        <button
            type="button"
            className={className}
            onClick={() => {
                // The cart lives on the server for logged-in users; don't leave a copy on a shared device.
                clearLocalCart();
                signOut({ redirectTo: '/' });
            }}
        >
            로그아웃
        </button>
    );
}
