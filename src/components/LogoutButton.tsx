'use client';

import React from 'react';
import { signOut } from 'next-auth/react';

// Client-side sign-out does a full page navigation, so the header's session state refreshes.
export function LogoutButton({ className = 'oc-auth__btn oc-auth__btn--plain' }: { className?: string }) {
    return (
        <button type="button" className={className} onClick={() => signOut({ redirectTo: '/' })}>
            로그아웃
        </button>
    );
}
