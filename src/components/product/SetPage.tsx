'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, ChevronDown, ChevronUp, Minus, Plus, ShoppingBag, User, Zap } from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import { PurchaseChooser } from '../purchase/PurchaseChooser';
import { useMixChoice } from '../purchase/MixPicker';
import {
    FREE_SHIPPING_MIN,
    MIN_SUBSCRIPTION_CHARGES,
    FLAVORS,
    MIX_UNIT,
    SHIPPING_FEE,
    evenMix,
    getItem,
    mixError,
    type CartLine,
} from '../../lib/catalog';
import { PRODUCT_PAGES, SET_PAGES, detailUrl, getSetPage } from '../../lib/products';
import { getAssetUrl } from '../../utils/assets';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** Slices shared by every flavour page (identical artwork), shown in this order on set pages. */
const COMMON_SLUG = 'grain';
const COMMON_SLICES = ['04.webp', '10.webp', 'review.mp4', 'rating.mp4', '05.webp', '08.webp', '11.webp'];

const TABS = [
    { id: 'pd-detail', label: '상품상세' },
    { id: 'pd-review', label: '리뷰' },
    { id: 'pd-qna', label: '상품문의' },
    { id: 'pd-ship', label: '배송·교환·반품' },
] as const;

export function SetPage({ count }: { count: number }) {
    const router = useRouter();
    const { status } = useSession();
    const { addLine, buyNow, count: cartCount, hydrated } = useCart();
    const page = getSetPage(count)!;
    const item = getItem(page.sku)!;
    const [qty, setQty] = useState(1);
    const [tab, setTab] = useState<string>(TABS[0].id);
    const [added, setAdded] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [infoSlug, setInfoSlug] = useState(PRODUCT_PAGES[0].slug);

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

    const { mixChoice, mixErr, picker } = useMixChoice(page.sku);
    const line: CartLine = { sku: page.sku, qty, mode: 'once', ...mixChoice };
    const total = item.price * qty;
    const unit = Math.round(item.price / item.count);
    const pct = Math.round(((item.listPrice - item.price) / item.listPrice) * 100);
    const clamp = (n: number) => Math.min(99, Math.max(1, n));
    const subscribable = item.subscribable;

    const goTab = (id: string) => {
        const el = document.getElementById(id);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 112, behavior: 'smooth' });
    };
    const handleCart = () => {
        if (mixErr) return;
        addLine(line);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };
    const handleBuy = async () => {
        if (mixErr) return;
        const dest = await buyNow(line);
        router.push(dest === 'checkout' ? '/checkout?type=once' : '/cart');
    };
    const goBack = () => {
        try {
            sessionStorage.setItem('oc_return', 'bundles');
        } catch {}
    };

    const actions = (
        <div className="pd-actions">
            <button type="button" className="pd-btn pd-btn--cart" onClick={handleCart} disabled={!!mixErr}>
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
                    <Link href="/#bundles" className="pd-top__brand" onClick={goBack}>
                        <ArrowLeft size={18} />
                        <span>참오트케어</span>
                    </Link>
                    <div className="pd-top__right">
                        <Link href="/cart" className="oc-nav__cart" aria-label="장바구니">
                            <ShoppingBag size={18} />
                            {hydrated && cartCount > 0 ? <span className="oc-nav__cart-badge">{cartCount}</span> : null}
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
                    <Link href="/#bundles" onClick={goBack}>
                        세트 구성
                    </Link>{' '}
                    <span>›</span> <b>{item.name}</b>
                </nav>

                <section className="pd-hero">
                    <div className="pd-gallery">
                        <img src={getAssetUrl(page.img)} alt={item.name} />
                    </div>

                    <div className="pd-buy">
                        <p className="pd-buy__tag">{page.tagline}</p>
                        <h1 className="pd-buy__name">{item.name}</h1>
                        <p className="pd-buy__desc">{page.description}</p>

                        <div className="pd-price">
                            <span className="pd-price__pct">{pct}%</span>
                            <s>{won(item.listPrice)}</s>
                            <strong>{won(item.price)}</strong>
                            <small>/ 개당 {won(unit)}</small>
                        </div>
                        <ul className="pd-facts">
                            {page.points.map((p) => (
                                <li key={p}>{p}</li>
                            ))}
                            <li>
                                배송비 무료 (세트 상품)
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

                        {picker}

                        {subscribable ? (
                            <PurchaseChooser sku={page.sku} qty={qty} mixChoice={mixChoice} blockedReason={mixErr} />
                        ) : (
                            <>
                                {actions}
                                <p className="pd-note">정기구독은 20·30개입 세트에서 가능해요 (최소 {MIN_SUBSCRIPTION_CHARGES}회 이용)</p>
                            </>
                        )}
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
                    <div className={`pd-slices pd-slices--set${expanded ? ' is-open' : ''}`}>
                        <div className="pd-setintro">
                            <h2>세트 구성</h2>
                            <p className="pd-lead">
                                {count === 10
                                    ? '5가지 맛을 각 2포씩, 총 10포로 구성됩니다.'
                                    : `5가지 맛 중 원하는 맛을 5개입 묶음으로 골라 총 ${count}포를 채워요. 기본은 5가지 맛 균등 구성이고, 위에서 직접 조합할 수 있어요.`}
                            </p>
                            <div className="pd-setflavors">
                                {PRODUCT_PAGES.map((p) => (
                                    <Link key={p.slug} href={`/products/${p.slug}`} className="pd-rec__card">
                                        <img src={getAssetUrl(p.img)} alt={`참오트케어 ${p.flavor}`} loading="lazy" />
                                        <b>{p.flavor}</b>
                                        <span>{p.ingredient}</span>
                                        <em>1포 {p.calories}</em>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {COMMON_SLICES.map((f, i) => {
                            const video = f.endsWith('.mp4');
                            return video ? (
                                <video
                                    key={f}
                                    className="pd-slice"
                                    src={detailUrl(COMMON_SLUG, f)}
                                    poster={detailUrl(COMMON_SLUG, f === 'review.mp4' ? '02.webp' : '03.webp')}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    preload="metadata"
                                />
                            ) : (
                                <img
                                    key={f}
                                    className="pd-slice"
                                    src={detailUrl(COMMON_SLUG, f)}
                                    alt="참오트케어 상세 이미지"
                                    loading={i < 1 ? 'eager' : 'lazy'}
                                    decoding="async"
                                />
                            );
                        })}

                        {subscribable ? (
                            <div className="pd-setintro">
                                <h2>정기구독 혜택</h2>
                                <ul className="pd-benefits">
                                    <li>구독 시 5% 추가 할인</li>
                                    <li>첫 회 쉐이커 보틀 증정</li>
                                    <li>결제일 기준으로 결제·발송 · 마이페이지에서 주기 변경·해지 예약</li>
                                    <li>최소 {MIN_SUBSCRIPTION_CHARGES}회 이용 조건</li>
                                </ul>
                            </div>
                        ) : null}

                        <img className="pd-slice" src={detailUrl(COMMON_SLUG, '12.webp')} alt="자주 묻는 질문" loading="lazy" decoding="async" />

                        <div className="pd-setintro">
                            <h2>제품 상세정보</h2>
                            <div className="pd-ftabs" role="tablist">
                                {PRODUCT_PAGES.map((p) => (
                                    <button
                                        key={p.slug}
                                        type="button"
                                        role="tab"
                                        aria-selected={infoSlug === p.slug}
                                        className={infoSlug === p.slug ? 'is-active' : ''}
                                        onClick={() => setInfoSlug(p.slug)}
                                    >
                                        {p.flavor}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <img
                            key={infoSlug}
                            className="pd-slice"
                            src={detailUrl(infoSlug, '13.webp')}
                            alt="제품 상세정보"
                            loading="lazy"
                            decoding="async"
                        />
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
                    <p className="pd-empty">참오트케어 쇼핑몰에서 구매하신 고객님의 후기가 이곳에 모일 예정이에요.</p>
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
                            결제 완료 후 순차 발송됩니다. 세트 상품은 배송비가 무료입니다. (낱개 상품만 구매 시 배송비 {won(SHIPPING_FEE)}, {won(FREE_SHIPPING_MIN)} 이상 무료)
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
                    <h2>다른 세트도 둘러보세요</h2>
                    <div className="pd-rec__grid pd-rec__grid--3">
                        {SET_PAGES.filter((s) => s.count !== count).map((s) => {
                            const it = getItem(s.sku)!;
                            return (
                                <Link key={s.count} href={`/sets/${s.count}`} className="pd-rec__card">
                                    <img src={getAssetUrl(s.img)} alt={it.name} loading="lazy" />
                                    <b>{it.name}</b>
                                    <span>{s.tagline}</span>
                                    <em>{won(it.price)}</em>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            </main>

            {!subscribable ? (
                <div className="pd-sticky">
                    <div className="pd-sticky__sum">
                        <span>{qty}세트</span>
                        <b>{won(total)}</b>
                    </div>
                    {actions}
                </div>
            ) : null}
        </div>
    );
}
