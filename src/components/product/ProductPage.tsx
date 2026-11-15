'use client';

import { ShipEta } from '../ShipEta';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, ChevronDown, ChevronUp, Minus, Plus, ShoppingBag, User, Zap, Repeat } from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import { SinglesBar, SinglesPicker } from '../purchase/SinglesBar';
import { ReviewList } from '../reviews/ReviewList';
import { ProductLabelInfo, ProductNotice } from './ProductNotice';
import { ShareButton } from '../share/ShareButton';
import { InquiryBoard } from '../inquiries/InquiryBoard';
import {
    FREE_SHIPPING_MIN_COUNT,
    MIN_SUBSCRIPTION_CHARGES,
    SHIPPING_FEE,
    SUBSCRIPTION_DISCOUNT_RATE,
    getItem,
    type CartLine,
} from '../../lib/catalog';
import { detailUrl, getProductPage } from '../../lib/products';
import { getAssetUrl } from '../../utils/assets';
import { MoreProducts } from './MoreProducts';
import { backToPrevious } from '../../lib/prev-page';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const SLICES = Array.from({ length: 13 }, (_, i) => String(i + 1).padStart(2, '0'));
/** Slices shown as short looping videos (much lighter than the original GIFs). */
const VIDEO_SLICES: Record<string, string> = { '02': 'review.mp4', '03': 'rating.mp4' };

const TABS = [
    { id: 'pd-detail', label: '상품상세' },
    { id: 'pd-review', label: '상품평' },
    { id: 'pd-qna', label: '상품문의' },
    { id: 'pd-ship', label: '배송/교환/반품 안내' },
] as const;

export function ProductPage({ slug }: { slug: string }) {
    const router = useRouter();
    const { status } = useSession();
    const { addLine, buyNow, count, hydrated } = useCart();
    const page = getProductPage(slug)!;
    const item = getItem(page.sku)!;
    const [tab, setTab] = useState<string>(TABS[0].id);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            let current: string = TABS[0].id;
            for (const t of TABS) {
                const el = document.getElementById(t.id);
                if (el && el.getBoundingClientRect().top <= 140) current = t.id;
            }
            setTab(current);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const pct = Math.round(((item.listPrice - item.price) / item.listPrice) * 100);
    const subPct = Math.round(SUBSCRIPTION_DISCOUNT_RATE * 100);

    const goTab = (id: string) => {
        const el = document.getElementById(id);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 112, behavior: 'smooth' });
    };
    return (
        <div className="pd">
            <header className="pd-top">
                <div className="pd-top__inner">
                    <Link
                        href="/#product-lineup"
                        className="pd-top__brand"
                        onClick={(e) => {
                            // Came from another page of this site: step back to exactly where the visitor was.
                            if (backToPrevious(e, () => router.back())) return;
                            try {
                                sessionStorage.setItem('oc_return', 'product-lineup');
                            } catch {}
                        }}
                    >
                        <ArrowLeft size={18} />
                        <span>참오트케어</span>
                    </Link>
                    <div className="pd-top__right">
                        <Link href="/cart" className="oc-nav__cart" aria-label="장바구니">
                            <ShoppingBag size={18} />
                            {hydrated && count > 0 ? <span className="oc-nav__cart-badge">{count}</span> : null}
                        </Link>
                        {status !== 'loading' && (
                            <Link className="oc-nav__auth" href={status === 'authenticated' ? '/mypage' : '/login'}>
                                <User size={15} />
                                <span>{status === 'authenticated' ? '마이페이지' : '로그인'}</span>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="pd-main">
                <nav className="pd-crumb" aria-label="현재 위치">
                    <Link href="/">홈</Link> <span>›</span> <Link href="/#product-lineup">맛 둘러보기</Link> <span>›</span>{' '}
                    <b>{page.flavor}</b>
                </nav>

                <section className="pd-hero">
                    <div className="pd-gallery">
                        <img src={getAssetUrl(page.img)} alt={`참오트케어 ${page.flavor}`} />
                    </div>

                    <div className="pd-buy">
                        <p className="pd-buy__tag">{page.tagline}</p>
                        <div className="pd-buy__titlerow">
                            <h1 className="pd-buy__name">{item.name}</h1>
                            <ShareButton title={`참오트케어 ${item.name}`} description={page.tagline} image={page.img} />
                        </div>
                        <p className="pd-buy__desc">{page.description}</p>

                        <div className="pd-price">
                            <span className="pd-price__pct">{pct}%</span>
                            <s>{won(item.listPrice)}</s>
                            <strong>{won(item.price)}</strong>
                            <small>/ 1포</small>
                        </div>
                        <ul className="pd-facts pd-facts--rows">
                            <li>
                                <b>주원료</b> {page.ingredient}
                            </li>
                            <li>
                                <b>열량</b> 1포 {page.calories}
                            </li>
                            <li>
                                <b>배송비</b> {won(SHIPPING_FEE)} (세트 구매 또는 낱개 {FREE_SHIPPING_MIN_COUNT}개(한 박스) 이상 무료)
                            </li>
                        </ul>

                        <ShipEta />
                        {/* Wide screens: mix flavours here. Phones: the same picker opens from the bottom bar. */}
                        <div className="pd-inline-buy">
                            <SinglesPicker flavor={page.flavor} />
                        </div>

                        <div className="pd-sub">
                            <Repeat size={18} />
                            <div>
                                <b>정기구독하면 {subPct}% 더 저렴해요</b>
                                <p>
                                    20·30개입 세트에서 정기구독 가능 · 첫 회 쉐이커 보틀 증정 · 최소 {MIN_SUBSCRIPTION_CHARGES}회 이용 조건
                                </p>
                                <Link href="/#bundles">세트 구성 보러가기 →</Link>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="pd-tabs" role="tablist">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={tab === t.id}
                            className={tab === t.id ? 'is-active' : ''}
                            onClick={() => goTab(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <section id="pd-detail" className="pd-sec pd-sec--detail">
                    <ProductLabelInfo name={item.name} flavors={[page.flavor]} count={1} />
                    <div className={`pd-slices${expanded ? ' is-open' : ''}`}>
                        {SLICES.map((n, i) => {
                            const video = VIDEO_SLICES[n];
                            return video ? (
                                <video
                                    key={n}
                                    className="pd-slice"
                                    src={detailUrl(slug, video)}
                                    poster={detailUrl(slug, `${n}.webp`)}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    preload="metadata"
                                    aria-label={`${page.flavor} 상세 이미지 ${n}`}
                                />
                            ) : (
                                <img
                                    key={n}
                                    className="pd-slice"
                                    src={detailUrl(slug, `${n}.webp`)}
                                    alt={`${page.flavor} 상세 이미지 ${n}`}
                                    loading={i < 2 ? 'eager' : 'lazy'}
                                    decoding="async"
                                />
                            );
                        })}
                    </div>
                    <div className="pd-more">
                        <button
                            type="button"
                            className="pd-more__btn"
                            aria-expanded={expanded}
                            onClick={() => {
                                if (expanded) goTab('pd-detail');
                                setExpanded((v) => !v);
                            }}
                        >
                            <span>{expanded ? '상품정보 접기' : '상품정보 더보기'}</span>
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </section>

                <section id="pd-review" className="pd-sec">
                    <h2>리뷰</h2>
                    <ReviewList sku={page.sku} />
                </section>

                <section id="pd-qna" className="pd-sec">
                    <h2>상품문의</h2>
                    <InquiryBoard sku={page.sku} />
                </section>

                <section id="pd-ship" className="pd-sec">
                    <h2>배송·교환·반품</h2>
                    <ProductNotice />
                </section>

                <MoreProducts current={page.sku} />
            </main>

            <SinglesBar flavor={page.flavor} />
        </div>
    );
}
