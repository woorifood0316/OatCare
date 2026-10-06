'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Repeat, Users, Bell } from 'lucide-react';

const NAV = [
    { href: '/admin', label: '대시보드', icon: LayoutDashboard, exact: true },
    { href: '/admin/orders', label: '주문', icon: Package },
    { href: '/admin/subscriptions', label: '구독', icon: Repeat },
    { href: '/admin/members', label: '회원', icon: Users },
    { href: '/admin/notifications', label: '알림', icon: Bell },
] as const;

export function AdminShell({ name, children }: { name: string | null; children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

    return (
        <div className="adm-shell">
            <aside className="adm-side">
                <Link href="/admin" className="adm-brand">
                    참오트케어 <span>운영</span>
                </Link>
                <nav className="adm-nav" aria-label="관리자 메뉴">
                    {NAV.map(({ href, label, icon: Icon, ...rest }) => {
                        const isActive = active(href, 'exact' in rest ? rest.exact : false);
                        return (
                            <Link key={href} href={href} className={`adm-nav__link${isActive ? ' is-active' : ''}`} aria-current={isActive ? 'page' : undefined}>
                                <Icon size={18} />
                                <span>{label}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="adm-side__foot">
                    <span>{name ?? '관리자'}</span>
                    <Link href="/mypage">마이페이지</Link>
                    <Link href="/">사이트 보기</Link>
                </div>
            </aside>
            <main className="adm-main">{children}</main>
        </div>
    );
}
