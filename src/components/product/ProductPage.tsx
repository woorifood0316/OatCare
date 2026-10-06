'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Minus, Plus, ShoppingBag, User, Zap, Repeat } from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import {
    FREE_SHIPPING_MIN,
    MIN_SUBSCRIPTION_CHARGES,
    SHIPPING_FEE,
    SUBSCRIPTION_DISCOUNT_RATE,
    getItem,
    type CartLine,
} from '../../lib/catalog';
import { PRODUCT_PAGES, detailUrl, getProductPage } from '../../lib/products';
import { getAssetUrl } from '../../utils/assets';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const SLICES = Array.from({ length: 13 }, (_, i) => String(i + 1).padStart(2, '0'));
/** Slices shown as short looping videos (much lighter than the original GIFs). */
const VIDEO_SLICES: Record<string, string> = { '02': 'review.mp4', '03': 'rating.mp4' };

const TABS = [
    { id: 'pd-detail', label: '상품상세' },
    { id: 'pd-review', label: '리뷰' },
    { id: 'pd-qna', label: '상품문의' },
    { id: 'pd-ship', label: '배송·교환·반품' },
] as const;

export function ProductPage({ slug }: { slug: string }) {
    const router = useRouter();
    const { status } = useSession();
    const { addLine, buyNow, count, hydrated } = useCart();
    const page = getProductPage(slug)!;
    const item = getItem(page.sku)!;
    const [qty, setQty] = useState(5);
    const [tab, setTab] = useState<string>(TABS[0].id);
    const [added, setAdded] = useState(false);

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

    const line: CartLine = { sku: page.sku, qty, mode: 'once' };
    const total = item.price * qty;
    const pct = Math.round(((item.listPrice - item.price) / item.listPrice) * 100);
    const subPct = Math.round(SUBSCRIPTION_DISCOUNT_RATE * 100);
    const clamp = (n: number) => Math.min(99, Math.max(1, n));

    const goTab = (id: string) => {
        const el = document.getElementById(id);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 112, behavior: 'smooth' });
    };
    const handleCart = () => {
        addLine(line);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };
    const handleBuy = async () => {
        const dest = await buyNow(line);
        router.push(dest === 'checkout' ? '/checkout?type=once' : '/cart');
    };

    const actions = (
        <div className="pd-actions">
            <button type="button" className="pd-btn pd-btn--cart" onClick={handleCart}>
                <ShoppingBag size={17} />
                <span>{added ? '담았어요 ✓' : '장바구니 담기'}</span>
            </button>
            <button type="button" className="pd-btn pd-btn--buy" onClick={handleBuy}>
                <Zap size={17} />
                <span>바로 구매</span>
            </button>
        </div>
    );

    return (
        <div className="pd">
            <header className="pd-top">
                <div className="pd-top__inner">
                    <Link href="/" className="pd-top__brand">
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
                        <h1 className="pd-buy__name">{item.name}</h1>
                        <p className="pd-buy__desc">{page.description}</p>

                        <div className="pd-price">
                            <span className="pd-price__pct">{pct}%</span>
                            <s>{won(item.listPrice)}</s>
                            <strong>{won(item.price)}</strong>
                            <small>/ 1포</small>
                        </div>
                        <ul className="pd-facts">
                            <li>
                                <b>주원료</b> {page.ingredient}
                            </li>
                            <li>
                                <b>열량</b> 1포 {page.calories}
                            </li>
                            <li>
                                <b>배송비</b> {won(SHIPPING_FEE)} (세트 구매 또는 {won(FREE_SHIPPING_MIN)} 이상 무료)
                            </li>
                        </ul>

                        <div className="pd-qty">
                            <span>수량</span>
                            <div className="pd-qty__ctl">
                                <button type="button" onClick={() => setQty((q) => clamp(q - 1))} aria-label="수량 줄이기">
                                    <Minus size={15} />
                                </button>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={99}
                                    value={qty}
                                    onChange={(e) => setQty(clamp(Number(e.target.value) || 1))}
                                    aria-label="수량"
                                />
                                <button type="button" onClick={() => setQty((q) => clamp(q + 1))} aria-label="수량 늘리기">
                                    <Plus size={15} />
                                </button>
                            </div>
                            <em>{won(total)}</em>
                        </div>

                        {actions}

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
                    <div className="pd-slices">
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
                </section>

                <section id="pd-review" className="pd-sec">
                    <h2>리뷰</h2>
                    <p className="pd-empty">
                        참오트케어 쇼핑몰에서 구매하신 고객님의 후기가 이곳에 모일 예정이에요. 상세 이미지 속 후기는 외부 판매처에서 작성된
                        후기입니다.
                    </p>
                </section>

                <section id="pd-qna" className="pd-sec">
                    <h2>상품문의</h2>
                    <p className="pd-empty">
                        상품에 대해 궁금한 점은 고객센터 이메일(yyp0606@naver.com)로 문의해 주세요. 평일 순차적으로 답변드립니다.
                    </p>
                </section>

                <section id="pd-ship" className="pd-sec">
                    <h2>배송·교환·반품</h2>
                    <dl className="pd-policy">
                        <dt>배송</dt>
                        <dd>
                            결제 완료 후 순차 발송됩니다. 배송비 {won(SHIPPING_FEE)}이며 세트 구매 또는 {won(FREE_SHIPPING_MIN)} 이상 구매 시
                            무료입니다.
                        </dd>
                        <dt>정기구독</dt>
                        <dd>
                            결제일 기준으로 결제·발송되며, 최소 {MIN_SUBSCRIPTION_CHARGES}회 이용 조건이 있습니다. 마이페이지에서 주기 변경과
                            해지 예약이 가능합니다.
                        </dd>
                        <dt>교환·반품</dt>
                        <dd>
                            식품 특성상 단순 변심에 의한 개봉 후 교환·반품은 어렵습니다. 상품 하자·오배송은 수령 후 7일 이내 고객센터로 연락
                            주시면 교환 또는 환불해 드립니다.
                        </dd>
                        <dt>반품처</dt>
                        <dd>경기도 김포시 양촌읍 황금1로 2-71 (우리종합식품)</dd>
                    </dl>
                </section>

                <section className="pd-sec pd-rec">
                    <h2>다른 맛도 둘러보세요</h2>
                    <div className="pd-rec__grid">
                        {PRODUCT_PAGES.filter((p) => p.slug !== slug).map((p) => (
                            <Link key={p.slug} href={`/products/${p.slug}`} className="pd-rec__card">
                                <img src={getAssetUrl(p.img)} alt={`참오트케어 ${p.flavor}`} loading="lazy" />
                                <b>{p.flavor}</b>
                                <span>{p.tagline}</span>
                                <em>{won(getItem(p.sku)!.price)}</em>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>

            <div className="pd-sticky">
                <div className="pd-sticky__sum">
                    <span>{qty}포</span>
                    <b>{won(total)}</b>
                </div>
                {actions}
            </div>
        </div>
    );
}
