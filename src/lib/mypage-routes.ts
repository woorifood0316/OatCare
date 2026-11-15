// Where each 마이페이지 screen sits: its title, the screen one level up (for "←" when there is no previous page),
// the breadcrumb on wide screens and which bottom tab is lit.

export interface MyRoute {
    title: string;
    /** One level up; null on the 마이페이지 home. */
    parent: string | null;
    crumbs: { label: string; href: string }[];
    /** Bottom tab to highlight (screens without a tab light 홈). */
    tab: string;
}

const HOME = { label: '마이페이지', href: '/mypage' };
const SECTIONS: Record<string, { title: string; tab: string }> = {
    subscription: { title: '정기구독', tab: '/mypage/subscription' },
    orders: { title: '주문·배송', tab: '/mypage/orders' },
    returns: { title: '교환·반품 내역', tab: '/mypage/orders' },
    payment: { title: '결제수단·배송지', tab: '/mypage/payment' },
    profile: { title: '내 정보', tab: '/mypage/profile' },
    coupons: { title: '쿠폰', tab: '/mypage' },
    reviews: { title: '리뷰 쓰기', tab: '/mypage' },
    inquiries: { title: '상품 문의', tab: '/mypage' },
    invite: { title: '친구 초대', tab: '/mypage' },
};

export function myRoute(pathname: string): MyRoute {
    const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean); // ['mypage', 'orders', 'OC…', 'return']
    if (parts.length <= 1) return { title: '마이페이지', parent: null, crumbs: [HOME], tab: '/mypage' };
    const key = parts[1];
    const section = SECTIONS[key] ?? { title: '마이페이지', tab: '/mypage' };
    const sectionHref = `/mypage/${key}`;
    const crumbs = [HOME, { label: section.title, href: sectionHref }];
    if (key === 'orders' && parts.length >= 3) {
        const detailHref = `/mypage/orders/${parts[2]}`;
        crumbs.push({ label: '주문 상세', href: detailHref });
        if (parts[3] === 'return') {
            crumbs.push({ label: '교환·반품 신청', href: pathname });
            return { title: '교환·반품 신청', parent: detailHref, crumbs, tab: section.tab };
        }
        return { title: '주문 상세', parent: sectionHref, crumbs, tab: section.tab };
    }
    return { title: section.title, parent: '/mypage', crumbs, tab: section.tab };
}
