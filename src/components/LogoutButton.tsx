'use client';

import React from 'react';
import { signOut } from 'next-auth/react';

// Client-side sign-out does a full page navigation, so the header's session state refreshes.
export function LogoutButton() {
    return (
        <button type="button" className="oc-auth__btn oc-auth__btn--plain" onClick={() => signOut({ redirectTo: '/' })}>
            로그아웃
        </button>
    );
}
