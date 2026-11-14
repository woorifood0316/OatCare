'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { myRoute } from '../../lib/mypage-routes';
import { backToPrevious } from '../../lib/prev-page';
import { Home, Repeat, Package, CreditCard, User, LifeBuoy, ShieldCheck, Ticket, Star, MessageCircleQuestion, Gift } from 'lucide-react';
import { LogoutButton } from '../LogoutButton';

const NAV = [
    { href: '/mypage', label: '홈', icon: Home, exact: true },
    { href: '/mypage/subscription', label: '정기구독', tabLabel: '구독', icon: Repeat },
    { href: '/mypage/orders', label: '주문·배송', tabLabel: '주문', icon: Package },
    { href: '/mypage/payment', label: '결제수단·배송지', tabLabel: '결제', icon: CreditCard },
    { href: '/mypage/profile', label: '내 정보', icon: User },
] as const;

export function MyShell({
    name,
    email,
    isAdmin,
    children,
}: {
    name: string | null;
    email: string | null;
    isAdmin: boolean;
    children: React.ReactNode;
}) {
    const pathname = usePathname() ?? '';
    const router = useRouter();
    const route = myRoute(pathname);
    // "←": back to the screen the visitor was just on; with no previous page (opened from a link or an email), one level up.
    const goBack = (e: React.MouseEvent) => backToPrevious(e, () => router.back());
    const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

    return (
        <div className="my-shell">
            <aside className="my-side">
                <Link href="/" className="my-side__brand">
                    <img src="/assets/oatcare-logo.png" alt="" />
                    <span>참오트케어</span>
                </Link>

                <div className="my-side__user">
                    <strong>{name || '회원'}</strong>
                    {email ? <span>{email}</span> : null}
                </div>

                <nav className="my-side__nav" aria-label="마이페이지 메뉴">
                    {NAV.map(({ href, label, icon: Icon, ...rest }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`my-side__link${isActive(href, 'exact' in rest ? rest.exact : false) ? ' is-active' : ''}`}
                            aria-current={isActive(href, 'exact' in rest ? rest.exact : false) ? 'page' : undefined}
                        >
                            <Icon size={18} />
                            <span>{label}</span>
                        </Link>
                    ))}
                    <Link href="/mypage/coupons" className={`my-side__link${pathname.startsWith('/mypage/coupons') ? ' is-active' : ''}`}>
                        <Ticket size={18} />
                        <span>쿠폰</span>
                    </Link>
                    <Link href="/mypage/reviews" className={`my-side__link${pathname.startsWith('/mypage/reviews') ? ' is-active' : ''}`}>
                        <Star size={18} />
                        <span>리뷰 쓰기</span>
                    </Link>
                    <Link href="/mypage/inquiries" className={`my-side__link${pathname.startsWith('/mypage/inquiries') ? ' is-active' : ''}`}>
                        <MessageCircleQuestion size={18} />
                        <span>상품 문의</span>
                    </Link>
                    <Link href="/mypage/invite" className={`my-side__link${pathname.startsWith('/mypage/invite') ? ' is-active' : ''}`}>
                        <Gift size={18} />
                        <span>친구 초대</span>
                    </Link>
                    {isAdmin ? (
                        <Link href="/admin" className="my-side__link">
                            <ShieldCheck size={18} />
                            <span>관리자</span>
                        </Link>
                    ) : null}
                </nav>

                <div className="my-side__foot">
                    <a href="tel:0319987234" className="my-side__link">
                        <LifeBuoy size={18} />
                        <span>고객센터 031-998-7234</span>
                    </a>
                    <LogoutButton className="my-side__logout" />
                </div>
            </aside>

            <div className="my-main">
                {route.parent ? (
                    <header className="my-topbar my-topbar--sub">
                        <Link href={route.parent} className="my-topbar__back" onClick={goBack} aria-label="뒤로 가기">
                            <ChevronLeft size={26} />
                        </Link>
                        <strong className="my-topbar__title">{route.title}</strong>
                    </header>
                ) : (
                    <header className="my-topbar">
                        <Link href="/" className="my-topbar__brand">
                            <img src="/assets/oatcare-logo.png" alt="" />
                            <span>참오트케어</span>
                        </Link>
                        <div className="my-topbar__right">
                            <Link href="/" className="my-topbar__home">
                                쇼핑하러 가기
                            </Link>
                            <LogoutButton className="my-topbar__logout" />
                        </div>
                    </header>
                )}

                <main className="my-content">
                    {route.parent ? (
                        <nav className="my-crumbs" aria-label="현재 위치">
                            {route.crumbs.map((c, i) => (
                                <React.Fragment key={c.href}>
                                    {i > 0 ? <ChevronRight size={14} aria-hidden="true" /> : null}
                                    {i < route.crumbs.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                                </React.Fragment>
                            ))}
                            {route.crumbs.length > 2 ? (
                                <Link href={route.parent} className="my-crumbs__back" onClick={goBack}>
                                    <ChevronLeft size={15} /> 목록으로
                                </Link>
                            ) : null}
                        </nav>
                    ) : null}
                    {children}
                </main>
            </div>

            <nav className="my-tabbar" aria-label="마이페이지 하단 메뉴">
                {NAV.map(({ href, label, icon: Icon, ...rest }) => {
                    const active = route.tab === href;
                    const tabLabel = 'tabLabel' in rest ? rest.tabLabel : label;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`my-tabbar__item${active ? ' is-active' : ''}`}
                            aria-current={active ? 'page' : undefined}
                        >
                            <Icon size={22} />
                            <span>{tabLabel}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
