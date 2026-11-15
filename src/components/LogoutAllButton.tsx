'use client';

import React, { useState } from 'react';
import { signOut } from 'next-auth/react';
import { clearLocalCart } from './cart/CartProvider';

/**
 * "모든 기기에서 로그아웃". Without memberId: the member ends every login of their own (this device too; a lost
 * phone is logged out the next time it opens the site). With memberId: the shop does it for a member (admin).
 */
export function LogoutAllButton({ memberId, label = '모든 기기에서 로그아웃', className = 'adm-btn' }: { memberId?: string; label?: string; className?: string }) {
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    const run = async () => {
        if (busy) return;
        const ask = memberId
            ? '이 회원이 로그인한 모든 기기에서 로그아웃시킬까요?'
            : '이 기기를 포함해 로그인한 모든 기기에서 로그아웃할까요? 다음에 들어올 때 다시 로그인하면 돼요.';
        if (!window.confirm(ask)) return;
        setBusy(true);
        try {
            const res = await fetch(memberId ? `/api/admin/members/${memberId}/logout-all` : '/api/account/logout-all', { method: 'POST' });
            if (!res.ok) throw new Error();
            if (memberId) {
                setDone(true);
                setBusy(false);
                return;
            }
            clearLocalCart();
            await signOut({ redirectTo: '/' });
        } catch {
            window.alert('처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
            setBusy(false);
        }
    };

    if (done) return <span className="adm-muted">로그아웃됨</span>;
    return (
        <button type="button" className={className} onClick={run} disabled={busy}>
            {busy ? '처리 중...' : label}
        </button>
    );
}
