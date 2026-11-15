'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import { ADMIN_IDLE_HOURS } from '../../lib/admin-idle-const';

/** Shown instead of the admin pages after 12 hours without use: log in again (one tap with Kakao / Naver / Google). */
export function AdminReauth() {
    return (
        <main className="oc-auth">
            <div className="oc-auth__card">
                <h1 className="oc-auth__title">다시 로그인해 주세요</h1>
                <p className="oc-auth__sub">
                    운영 화면을 {ADMIN_IDLE_HOURS}시간 동안 사용하지 않아 고객 정보 보호를 위해 접속을 끊었어요. 다시 로그인하면 바로 이어서 쓸 수 있어요.
                </p>
                <button
                    type="button"
                    className="oc-welcome__start"
                    onClick={() => signOut({ redirectTo: '/login?callbackUrl=%2Fadmin' })}
                >
                    다시 로그인하기
                </button>
            </div>
        </main>
    );
}
