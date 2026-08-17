import React, { useState } from 'react';
import { BookOpen, Leaf, Moon, ShoppingBag, Star, Zap, ShieldCheck, Flame, Scale, Clock, HeartPulse, CheckCircle2, X, User, ExternalLink, ArrowRight } from 'lucide-react';
import { BundleItem, ProductItem } from '../types';
import { ProductDetailItem } from './ProductDetailModal';

export interface NavProps {
    onOpenDrawer?: (tab?: 'single' | 'bundle') => void;
}

export const Nav: React.FC<NavProps> = ({ onOpenDrawer }) => {
    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        e.preventDefault();
        const element = document.getElementById(targetId);
        if (element) {
            const headerOffset = 75;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    return (
        <header className="oc-nav">
            <div className="oc-nav__inner">
                <a
                    href="#hero"
                    className="oc-nav__brand"
                    onClick={(e) => handleNavClick(e, 'hero')}
                >
                    <img src="/assets/oatcare-logo.png" alt="오트케어 로고" className="oc-nav__logo-img" />
                    <span>OatCare</span>
                </a>

                <nav className="oc-nav__links">
                    <a className="oc-nav__link" href="#why-oatcare" onClick={(e) => handleNavClick(e, 'why-oatcare')}>
                        WHY OATCARE
                    </a>
                    <a className="oc-nav__link" href="#product-lineup" onClick={(e) => handleNavClick(e, 'product-lineup')}>
                        맛 둘러보기
                    </a>
                    <a className="oc-nav__link" href="#reviews" onClick={(e) => handleNavClick(e, 'reviews')}>
                        고객 후기
                    </a>
                    <a className="oc-nav__link" href="#bundles" onClick={(e) => handleNavClick(e, 'bundles')}>
                        세트 구성
                    </a>
                    <a className="oc-nav__link" href="#content" onClick={(e) => handleNavClick(e, 'content')}>
                        아침 가이드
                    </a>
                </nav>

                <button
                    className="oc-cta-fill"
                    onClick={(e) => {
                        e.preventDefault();
                        onOpenDrawer?.('single');
                    }}
                >
                    <ShoppingBag size={18} />
                    <span>지금 구매하기</span>
                </button>
            </div>
        </header>
    );
};

// ❶ Bold Statement — Apple Style Minimal Messaging & Impact Metrics
export const BoldStatement: React.FC = () => {
    const sectionRef = React.useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = React.useState(false);
    const [hasRevealed, setHasRevealed] = React.useState(false);
    const [countSec, setCountSec] = React.useState(0);
    const [countKcal, setCountKcal] = React.useState(0);
    const [countRating, setCountRating] = React.useState(0.0);

    React.useEffect(() => {
        let animFrameId: number;
        let timeoutId: any;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    setHasRevealed(true); // Permanent text reveal ONCE

                    // Wait 400ms then start count-up over 2.2s
                    timeoutId = setTimeout(() => {
                        const duration = 2200; // ms
                        const startTime = performance.now();

                        const animateCounts = (currentTime: number) => {
                            const elapsed = currentTime - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            const easeProgress = 1 - Math.pow(1 - progress, 3);

                            setCountSec(Math.floor(easeProgress * 30));
                            setCountKcal(Math.floor(easeProgress * 195));
                            setCountRating(Number((easeProgress * 4.9).toFixed(1)));

                            if (progress < 1) {
                                animFrameId = requestAnimationFrame(animateCounts);
                            } else {
                                setCountSec(30);
                                setCountKcal(195);
                                setCountRating(4.9);
                            }
                        };

                        cancelAnimationFrame(animFrameId);
                        animFrameId = requestAnimationFrame(animateCounts);
                    }, 400);
                } else {
                    setIsVisible(false);
                    clearTimeout(timeoutId);
                    cancelAnimationFrame(animFrameId);
                    setCountSec(0);
                    setCountKcal(0);
                    setCountRating(0.0);
                }
            },
            { threshold: 0.3 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => {
            clearTimeout(timeoutId);
            cancelAnimationFrame(animFrameId);
            observer.disconnect();
        };
    }, []);

    return (
        <section
            ref={sectionRef}
            className={`oc-section oc-bold-apple-section ${hasRevealed ? 'has-revealed' : ''} ${isVisible ? 'is-visible' : ''}`}
            id="why-oatcare"
        >
            <div className="oc-apple-wrapper">
                <span className="oc-apple-eyebrow">WHY OATCARE</span>

                <h2 className="oc-apple-headline">
                    <span className="oc-apple-headline-line line-1">아침, 더 이상 굶지 마세요.</span>
                    <span className="oc-apple-headline-line line-2 oc-apple-gradient">물 하나로 <span className="oc-highlight-maroon">30초 완성.</span></span>
                </h2>

                <p className="oc-apple-subhead">
                    <span className="oc-highlight-gold">약 195 kcal</span>의 부담 없는 가벼움. <span className="oc-highlight-maroon">9가지 곡물</span>의 깊은 포만감.
                </p>

                <div className="oc-apple-metrics">
                    <div className="oc-apple-metric">
                        <span className="oc-apple-metric__val">
                            <small>약 </small>{countSec}<small>초</small>
                        </span>
                        <span className="oc-apple-metric__lbl">초간단 한 끼</span>
                    </div>
                    <div className="oc-apple-metric__divider" />
                    <div className="oc-apple-metric">
                        <span className="oc-apple-metric__val">
                            <small>평균 </small>{countKcal}<small>kcal</small>
                        </span>
                        <span className="oc-apple-metric__lbl">부담 없는 가벼움</span>
                    </div>
                    <div className="oc-apple-metric__divider" />
                    <div className="oc-apple-metric">
                        <span className="oc-apple-metric__val">
                            <small>리뷰 </small>{countRating.toFixed(1)}<small>★</small>
                        </span>
                        <span className="oc-apple-metric__lbl">12만+ 봉지 검증</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ❷ 3 Pillars — 건강식 · 간편식 · 다이어트식
export const Pillars: React.FC = () => {
    const pillars = [
        {
            num: '01',
            tag: '건강식',
            title: '9가지 곡물의 완벽 영양 밸런스',
            desc: '귀리(Oat) 중심의 백태, 서리태, 찰현미 등 9가지 곡물이 빚어낸 균형 잡힌 식이섬유와 가벼운 단백질.',
            icon: ShieldCheck,
            highlight: '식이섬유 4.2g · 당류 3.5g',
        },
        {
            num: '02',
            tag: '간편식',
            title: '뜯고 붓고 저으면 30초 완벽 한 끼',
            desc: '이지컷 뜯어 물이나 우유 180ml 붓고 30초만 저으면 끝. 설거지 걱정 없는 가방 속 50g 파우치.',
            icon: Clock,
            highlight: '물 / 우유 OK · 설거지 Zero',
        },
        {
            num: '03',
            tag: '다이어트식',
            title: '180~210 kcal의 부담 없는 가벼움',
            desc: '일반 식사의 1/3 칼로리로 죄책감 없는 든든함. 포만감은 오래 지속되고 몸은 가볍게 유지됩니다.',
            icon: Scale,
            highlight: '일반 식사의 1/3 칼로리',
        },
    ];

    return (
        <div className="oc-band oc-band--tan">
            <section className="oc-section" id="pillars">
                <div className="oc-section-header">
                    <span className="oc-eyebrow">3 Core Pillars</span>
                    <h2>건강식 · 간편식 · 다이어트식<br /><span className="oc-highlight-maroon">오트케어</span>로 한 번에 해결하세요</h2>
                </div>

                <div className="oc-pillars-grid">
                    {pillars.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <div key={item.num} className="oc-pillar-card">
                                <div className="oc-pillar-card__header">
                                    <span className="oc-pillar-card__num">{item.num}</span>
                                    <span className="oc-pillar-card__tag">{item.tag}</span>
                                </div>

                                <h3>{item.title}</h3>
                                <p>{item.desc}</p>

                                <div className="oc-pillar-card__footer">
                                    <IconComponent size={16} />
                                    <span>{item.highlight}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

// ❸ Quick Reviews — Real customer quotes
const REVIEWS = [
    {
        text: '출근길 지하철에서 물 부어 마시는데 진짜 고소해요. 공복감이 싹 사라졌어요.',
        name: '김*진',
        desc: '32세 직장인 · 3개월째 재구매',
        rating: 5,
        flavor: '🌾 그레인 구매',
        badge: '실제 구매자',
    },
    {
        text: '야근 중 라면 대신 이거 먹으니까 다음 날 안 부어요. 죄책감 없이 먹을 수 있어서 최고.',
        name: '이*현',
        desc: '28세 운동 마니아 · 5회 재구매',
        rating: 5,
        flavor: '💪 단백질 구매',
        badge: 'VIP 회원',
    },
    {
        text: '아이들한테 주기 좋아요. 화학 첨가물 없어서 안심이고, 고구마맛 고소해서 잘 먹어요.',
        name: '박*혜',
        desc: '39세 학부모 · 4회 재구매',
        rating: 5,
        flavor: '🍠 고구마 구매',
        badge: '실제 구매자',
    },
    {
        text: '아침 마다 5분씩 더 잘 수 있게 됐어요. 텀블러 안 씻어도 되니 삶의 질 상승!',
        name: '최*우',
        desc: '31세 개발자 · 2개월째 구독',
        rating: 5,
        flavor: '🍫 초코 구매',
        badge: '정기 구독자',
    },
    {
        text: '다이어트할 때 가장 힘든 게 고소한 맛인데, 서리태 맛은 고소함 끝판왕입니다.',
        name: '정*아',
        desc: '26세 대학원생 · 3회 재구매',
        rating: 5,
        flavor: '🖤 서리태 구매',
        badge: '실제 구매자',
    },
];

// ❸ Real Reviews — Infinite Marquee Live Ticker (Option 2)
export const QuickReviews: React.FC = () => {
    const marqueeList = [...REVIEWS, ...REVIEWS, ...REVIEWS];
    return (
        <section className="oc-section oc-reviews-marquee-section" id="reviews">
            <div className="oc-section-header">
                <span className="oc-eyebrow">Real Reviews</span>
                <h2>5,400명+이 입을 모아 <span className="oc-highlight-maroon">재구매하는 이유</span></h2>
                <p className="oc-section-subhead">
                    12만+ 봉지로 검증된 오트케어 실제 구매자들의 생생한 리뷰입니다.
                </p>
            </div>

            <div className="oc-marquee-container">
                <div className="oc-marquee-track">
                    {marqueeList.map((r, idx) => (
                        <div key={`${r.name}-${idx}`} className="oc-marquee-card">
                            <div className="oc-marquee-card-top">
                                <span className="oc-review-flavor-chip">{r.flavor}</span>
                                <div className="oc-review-glass-stars">
                                    {[...Array(r.rating)].map((_, i) => (
                                        <Star key={i} size={13} fill="#C9963C" color="#C9963C" />
                                    ))}
                                </div>
                            </div>
                            <p className="oc-marquee-text">"{r.text}"</p>
                            <div className="oc-marquee-author">
                                <strong>{r.name}</strong>
                                <span>{r.desc}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

interface ProductItemDetailed extends ProductItem {
    icon: string;
    badge?: string;
    ingredient: string;
    calories: string;
    accentColor: string;
    desc: string;
    tasteNote: string;
    mood: string;
    moodDesc: string;
    shakeColor: string;
}

export const RICH_PRODUCTS: ProductItemDetailed[] = [
    {
        flavor: '그레인',
        icon: '🌾',
        tag: '고소한 오곡라떼 맛 · 식사대용 1위',
        img: '/assets/product-grain.png',
        price: 1100,
        listPrice: 1250,
        lead: true,
        badge: 'BEST 인기 1위',
        ingredient: '귀리 16% + 곡물 9종 황금 블렌딩',
        calories: '203 kcal',
        accentColor: '#C9963C',
        desc: '각종 통곡물이 듬뿍 들어가 고소한 오곡라떼의 풍미! 호불호 없이 온 가족이 가장 좋아하는 시그니처 1위 맛.',
        tasteNote: '카페 오곡라떼처럼 진하고 부드러운 고소함',
        mood: '🌾 고소하고 든든한 아침이 필요할 때',
        moodDesc: '9가지 곡물 블렌딩으로 속 편하게 채우는 오트케어 베스트셀러',
        shakeColor: '#D97706',
    },
    {
        flavor: '고구마',
        icon: '🍠',
        tag: '카페 고구마라떼 맛 · 아이 선호 1위',
        img: '/assets/product-goguma.png',
        price: 1100,
        listPrice: 1250,
        badge: '아이 선호 1위',
        ingredient: '국산 달콤한 고구마 15%',
        calories: '186 kcal',
        accentColor: '#D97706',
        desc: '카페에서 판매하는 진한 고구마라떼 맛을 그대로 구현! 화학 첨가물 없이 고구마 본연의 자연스러운 달콤함.',
        tasteNote: '카페에서 마시던 달콤한 고구마라떼 그 맛',
        mood: '🍯 부드러운 달콤함이 생각날 때',
        moodDesc: '아이 간식으로도 딱 좋은 100% 해남 고구마 라떼 풍미',
        shakeColor: '#F59E0B',
    },
    {
        flavor: '단백질',
        icon: '💪',
        tag: '단백질 17g 폭탄 · 달걀 3개분',
        img: '/assets/product-protein.png',
        price: 1100,
        listPrice: 1250,
        badge: '단백질 17g 함유',
        ingredient: 'WPC 식물성/동물성 황금 비율',
        calories: '213 kcal',
        accentColor: '#7A2331',
        desc: '단백질 17g(달걀 3개분) 함유! 비린맛 전혀 없이 간편하고 맛있게 단백질을 보충하는 고단백 쉐이크.',
        tasteNote: '비린맛 전혀 없는 깔끔하고 묵직한 곡물 쉐이크',
        mood: '🏋️ 운동 후 고단백 필요할 때',
        moodDesc: '달걀 3개분 단백질 17g으로 근육과 포만감을 동시에',
        shakeColor: '#B91C1C',
    },
    {
        flavor: '서리태',
        icon: '🖤',
        tag: '검은콩 두유 맛 · 국산 서리태 100%',
        img: '/assets/product-seoritae.png',
        price: 1100,
        listPrice: 1250,
        badge: '농가 직송 서리태',
        ingredient: '국산 검은콩 서리태 12%',
        calories: '198 kcal',
        accentColor: '#3F3F46',
        desc: '우유에 타 먹으면 달콤하고 고소한 검은콩 두유 맛이 일품! 속 더부룩함 없이 부드럽게 감싸주는 블랙푸드.',
        tasteNote: '진하고 달콤고소한 프리미엄 검은콩 두유 맛',
        mood: '☕ 깊은 고소함과 힐링',
        moodDesc: '국산 검은콩 100%의 진하고 안심할 수 있는 건강한 영양',
        shakeColor: '#4B5563',
    },
    {
        flavor: '초코',
        icon: '🍫',
        tag: '진짜 초코라떼 맛 · 단백질 13g',
        img: '/assets/product-choco.png',
        price: 1100,
        listPrice: 1250,
        badge: '단백질 13g + 길티프리',
        ingredient: '네덜란드산 프리미엄 코코아 6.9%',
        calories: '199 kcal',
        accentColor: '#78350F',
        desc: '인공 초코 향이 아닌 진짜 초코 맛에 단백질 13g 함유! 야근이나 다이어트 중 죄책감 없이 즐기는 당 충전.',
        tasteNote: '진한 초코 우유처럼 달콤하지만 199kcal의 가벼움',
        mood: '🍫 스트레스 당 충전 디저트',
        moodDesc: '리얼 코코아로 당 충전하지만 199kcal의 가벼운 디저트 대용',
        shakeColor: '#92400E',
    },
];

interface ProductOptionProps {
    onSelectProduct?: (product: ProductItemDetailed) => void;
}

export const StampBadge: React.FC<{ text: string; color?: string }> = ({ text, color = '#7A2331' }) => {
    const isBest = text.includes('BEST') || text.includes('1위');

    if (isBest) {
        return (
            <div className="oc-stamp oc-stamp--best" style={{ '--stamp-color': color } as React.CSSProperties}>
                <div className="oc-stamp__ring">
                    <div className="oc-stamp__inner">
                        <span className="oc-stamp__star">★ BEST ★</span>
                        <span className="oc-stamp__rank">1위</span>
                        <span className="oc-stamp__label">인기 No.1</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="oc-stamp oc-stamp--badge" style={{ '--stamp-color': color } as React.CSSProperties}>
            <div className="oc-stamp__inner">
                <span className="oc-stamp__icon">★</span>
                <span className="oc-stamp__text">{text}</span>
            </div>
        </div>
    );
};

// ❹ 5-Flavor Product Showcase: 2-Top + 3-Bottom Symmetrical Luxury Grid
export const ProductGrid: React.FC<ProductOptionProps> = ({ onSelectProduct }) => {
    const topProducts = RICH_PRODUCTS.slice(0, 2);
    const bottomProducts = RICH_PRODUCTS.slice(2, 5);

    const renderCard = (p: ProductItemDetailed) => (
        <div
            key={p.flavor}
            className="oc-grid-card"
            style={{ '--card-glow': p.accentColor } as React.CSSProperties}
        >
            <div className="oc-grid-card-glow" />
            {p.badge && <StampBadge text={p.badge} color={p.accentColor || '#7A2331'} />}

            <div className="oc-grid-card-img-wrap" style={{ cursor: 'pointer' }} onClick={() => onSelectProduct?.(p)}>
                <img src={p.img} alt={`오트케어 ${p.flavor}`} />
            </div>

            <div className="oc-grid-card-body">
                <span className="oc-grid-tag">{p.tag}</span>
                <h4 style={{ cursor: 'pointer' }} onClick={() => onSelectProduct?.(p)}>
                    {p.icon} 오트케어 {p.flavor}
                </h4>
                <p className="oc-grid-ingr">{p.ingredient}</p>

                <div className="oc-grid-price-row">
                    <span className="disc">-{Math.round(((p.listPrice - p.price) / p.listPrice) * 100)}%</span>
                    <strong className="price">{p.price.toLocaleString('ko-KR')}원</strong>
                    {p.listPrice > p.price && (
                        <s className="list-price">{p.listPrice.toLocaleString('ko-KR')}원</s>
                    )}
                    <span className="cal">{p.calories}</span>
                </div>

                <div className="oc-grid-cta-row">
                    <button className="oc-cta-outline" onClick={() => onSelectProduct?.(p)}>
                        <span>상세보기</span>
                    </button>
                    <button className="oc-cta-fill" onClick={() => alert(`[오트케어 ${p.flavor}] 장바구니에 담겼습니다!`)}>
                        <ShoppingBag size={15} />
                        <span style={{ textAlign: 'center', lineHeight: '1.25', display: 'inline-block' }}>
                            장바구니<br />담기
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <section className="oc-section" id="product-lineup">
            <div className="oc-section-header">
                <span className="oc-eyebrow">5 FLAVORS COLLECTION</span>
                <h2>다섯 가지 맛, <span className="oc-highlight-maroon">질리지 않는 아침</span></h2>
                <p className="oc-section-subhead">
                    매일 아침 기분에 따라 선택하세요. <span className="oc-highlight-maroon">오트케어 5종 라인업</span>입니다.
                </p>
            </div>

            {/* Top Row: 2 Cards */}
            <div className="oc-grid-row-top">
                {topProducts.map(renderCard)}
            </div>

            {/* Bottom Row: 3 Cards */}
            <div className="oc-grid-row-bottom">
                {bottomProducts.map(renderCard)}
            </div>
        </section>
    );
};

const NUTRITION_STATS = [
    { flavor: '그레인', kcal: 203, stat: '귀리 16% · 곡물 9종 블렌딩' },
    { flavor: '고구마', kcal: 186, stat: '국산 달콤한 고구마 15%' },
    { flavor: '단백질', kcal: 213, stat: '단백질 17g (달걀 3개분)' },
    { flavor: '서리태', kcal: 198, stat: '국산 검은콩 서리태 12%' },
    { flavor: '초코', kcal: 199, stat: '리얼 코코아분말 6.9%' },
];

export const Nutrition: React.FC = () => {
    return (
        <section className="oc-section" id="nutrition">
            <div className="oc-section-header">
                <span className="oc-eyebrow">SATISFACTION & NUTRITION</span>
                <h2>약 195 kcal로 채우는 <span className="oc-highlight-maroon">4시간의 속 편한 포만감</span></h2>
                <p className="oc-section-subhead">
                    귀리(Oat) 속 핵심 수용성 식이섬유 <span className="oc-highlight-gold">'베타글루칸'</span>과 9가지 곡물 레시피로 장시간 공복감을 싹 없애줍니다.
                </p>
            </div>

            <div className="oc-nutrition-dashboard">
                {/* Highlight Stats Bar */}
                <div className="oc-nutrition-hero-stats">
                    <div className="oc-nutrition-stat-box">
                        <Flame className="stat-icon" size={24} />
                        <span className="stat-num">4<small>시간</small></span>
                        <span className="stat-label">든든한 포만감 (귀리 베타글루칸)</span>
                    </div>
                    <div className="oc-nutrition-stat-box">
                        <Leaf className="stat-icon" size={24} />
                        <span className="stat-num">4.2 <small>g</small></span>
                        <span className="stat-label">풍부한 식이섬유 (사과 2개분)</span>
                    </div>
                    <div className="oc-nutrition-stat-box">
                        <ShieldCheck className="stat-icon" size={24} />
                        <span className="stat-num">7.8 <small>g+</small></span>
                        <span className="stat-label">고품질 단백질 (달걀 1.2~3개분)</span>
                    </div>
                </div>

                {/* Flavor Breakdown Grid */}
                <div className="oc-nutrition-grid">
                    {NUTRITION_STATS.map((n) => (
                        <div key={n.flavor} className="oc-nutrition-item">
                            <div className="oc-nutrition-item__head">
                                <strong>오트케어 {n.flavor}</strong>
                                <span className="oc-num-badge">{n.kcal} kcal</span>
                            </div>
                            <p className="oc-nutrition-item__sub">{n.stat}</p>
                        </div>
                    ))}
                </div>

                {/* Meal Comparison Bar */}
                <div className="oc-nutrition-comparison">
                    <h3>아침 식사별 포만감 & 칼로리 비교</h3>
                    <div className="oc-comparison-bars">
                        <div className="oc-comparison-bar-item">
                            <div className="bar-info">
                                <span>오트케어 (50g)</span>
                                <strong>195 kcal</strong>
                            </div>
                            <div className="bar-track">
                                <div className="bar-fill bar-fill--oatcare" style={{ width: '40%' }} />
                            </div>
                            <span className="bar-tag">4시간 든든함 & 속 편함 (추천)</span>
                        </div>

                        <div className="oc-comparison-bar-item">
                            <div className="bar-info">
                                <span>삼각김밥 1개</span>
                                <strong>230 kcal</strong>
                            </div>
                            <div className="bar-track">
                                <div className="bar-fill" style={{ width: '48%' }} />
                            </div>
                            <span className="bar-tag">1~2시간 후 급격한 공복감</span>
                        </div>

                        <div className="oc-comparison-bar-item">
                            <div className="bar-info">
                                <span>베이커리 샌드위치</span>
                                <strong>480 kcal</strong>
                            </div>
                            <div className="bar-track">
                                <div className="bar-fill" style={{ width: '100%' }} />
                            </div>
                            <span className="bar-tag">높은 칼로리 & 더부룩함</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ❺ NEW Section: Family Brand Story
export const FamilyStory: React.FC = () => {
    const familyMoments = [
        {
            role: '👨‍💼 바쁜 출근길 남편',
            quote: (
                <>
                    "지하철에서 물 부어 30초 만에 마시는데 진짜 고소해요. <span className="oc-highlight-text">점심시간까지 공복감이 싹 사라졌어요.</span>"
                </>
            ),
            tag: '오트케어 그레인 / 단백질 추천',
            icon: '👔',
        },
        {
            role: '👩‍👧 육아에 지친 엄마',
            quote: (
                <>
                    "아이 챙기느라 정작 내 아침은 매번 놓쳤는데, <span className="oc-highlight-text">죄책감 없이 가볍고 든든하게</span> 챙겨 먹어요."
                </>
            ),
            tag: '오트케어 고구마 / 초코 추천',
            icon: '🏡',
        },
        {
            role: '🎒 등교하는 자녀',
            quote: (
                <>
                    "아침에 밥 안 먹는 아이인데, 서리태 맛 우유에 타주면 <span className="oc-highlight-text">검은콩 두유 같아서 싹 비우고</span> 등교해요."
                </>
            ),
            tag: '오트케어 서리태 / 고구마 추천',
            icon: '🎒',
        },
        {
            role: '👵 연로하신 부모님',
            quote: (
                <>
                    "아침마다 속이 더부룩해서 식사 못 하시던 부모님이 <span className="oc-highlight-text">속 편하다고 매일 아침 찾으십니다.</span>"
                </>
            ),
            tag: '오트케어 서리태 / 그레인 추천',
            icon: '❤️',
        },
    ];

    return (
        <section className="oc-section" id="family-story">
            <div className="oc-section-header">
                <span className="oc-eyebrow">OUR BRAND STORY</span>
                <h2>
                    나와 내가 사랑하는 사람들이 매일 아침 <span className="oc-highlight-maroon">안심하고 먹는 정직함</span>
                </h2>
                <p className="oc-section-subhead">
                    간편함 그 이상의 가치. <span className="oc-highlight-gold">정직한 귀리 영양</span>으로 소중한 사람들의 하루를 힘차게 시작하세요.
                </p>
            </div>

            <div className="oc-family-grid">
                {familyMoments.map((item, index) => (
                    <div key={index} className="oc-family-card">
                        <div className="oc-family-card-head">
                            <span className="family-icon">{item.icon}</span>
                            <h4>{item.role}</h4>
                        </div>
                        <p className="oc-family-quote">{item.quote}</p>
                        <span className="oc-family-tag">{item.tag}</span>
                    </div>
                ))}
            </div>
        </section>
    );
};

export interface BundlesProps {
    onSelectProduct?: (product: ProductDetailItem) => void;
}

export const BUNDLES: (ProductDetailItem & {
    count: number;
    highlight?: boolean;
    unitPrice: number;
    optionNotice: string;
})[] = [
        {
            flavor: '5종 맛보기 10개입 세트',
            icon: '🎁',
            badge: '맛보기 강추 (개당 1,200원)',
            tag: '5가지 맛 각 2개입 · 총 10개 구성',
            img: '/assets/bundle-all-1.jpg',
            price: 12000,
            listPrice: 12500,
            unitPrice: 1200,
            count: 10,
            ingredient: '그레인(2), 고구마(2), 단백질(2), 서리태(2), 초코(2) 각 2개씩 총 10포',
            calories: '평균 195 kcal / 1포',
            accentColor: '#C9963C',
            desc: '오트케어 5가지 맛을 각 2개씩 총 10개 구성! 개당 1,200원(정가 1,250원 대비 할인)의 알뜰한 가격으로 온 가족 취향을 먼저 탐색해 보세요.',
            tasteNote: '5가지 전 맛을 부담 없이 경험해보는 베스트 입문용 세트',
            mood: '🎁 5가지 맛 골고루 체험',
            shakeColor: '#D97706',
            optionNotice: '5가지 맛 각 2개씩 균등 10개 배송',
        },
        {
            flavor: '든든 20개입 한달 박스',
            icon: '📦',
            badge: 'BEST 인기 1위 (개당 990원)',
            tag: '맛별 최소 5개 선택 · 무료 배송',
            img: '/assets/bundle-all-2.jpg',
            price: 19800,
            listPrice: 25000,
            unitPrice: 990,
            count: 20,
            highlight: true,
            ingredient: '5가지 맛 중 원하는 맛을 자유 조합 (맛별 최소 5개 선택 가능)',
            calories: '평균 195 kcal / 1포',
            accentColor: '#D97706',
            desc: '정가 개당 1,250원에서 개당 990원으로 파격 할인! 맛별로 최소 5개씩 자유롭게 조합하여 한 달 아침을 든든하게 해결하는 인기 1위 세트 (무료 배송)',
            tasteNote: '한 달간 매일 아침을 책임지는 재구매율 1위 베스트셀러 세트',
            mood: '⚡ 한 달 아침 완벽 해결',
            shakeColor: '#F59E0B',
            optionNotice: '맛별 최소 5개 이상 자율 선택 조합',
        },
        {
            flavor: '대용량 30개입 패밀리 박스',
            icon: '👑',
            badge: '최고 혜택 (개당 900원)',
            tag: '맛별 최소 5개 선택 · 보틀 증정',
            img: '/assets/bundle-all-3.jpg',
            price: 27000,
            listPrice: 37500,
            unitPrice: 900,
            count: 30,
            ingredient: '원하는 맛 자율 조합 (맛별 최소 5개) + 오트케어 전용 쉐이커 보틀 증정',
            calories: '평균 195 kcal / 1포',
            accentColor: '#7A2331',
            desc: '정가 개당 1,250원에서 개당 900원 파격 최저가! 온 가족 대용량 세트로 전용 쉐이커 보틀까지 무료 증정합니다.',
            tasteNote: '개당 900원 최저가 + 전용 쉐이커 보틀 100% 증정 패밀리 세트',
            mood: '👨‍👩‍👧‍👦 온 가족 대용량 혜택',
            shakeColor: '#B91C1C',
            optionNotice: '맛별 최소 5개 선택 + 전용 보틀 무료 증정',
        },
    ];

export const Bundles: React.FC<BundlesProps> = ({ onSelectProduct }) => {
    const sectionRef = React.useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.15 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section
            ref={sectionRef}
            className={`oc-section oc-bundles-section ${isVisible ? 'is-visible' : ''}`}
            id="bundles"
        >
            <div className="oc-section-header">
                <span className="oc-eyebrow">Starter Bundles</span>
                <h2>
                    세트로 더 알차게 <span className="oc-highlight-maroon">챙기는 아침</span>
                </h2>
                <p className="oc-section-subhead">
                    세트 구매 시 <span className="oc-highlight-gold">최대 28% 파격 할인</span>과 전 세트 <span className="oc-highlight-maroon">무료 배송 혜택</span>을 제공합니다.
                </p>
            </div>

            <div className="oc-bundles-grid">
                {BUNDLES.map((b) => (
                    <div
                        key={b.flavor}
                        className={`oc-bundle-card ${b.highlight ? 'oc-bundle-card--highlight' : ''} ${b.count === 10 ? 'oc-bundle-card--starter' : ''} ${b.count === 30 ? 'oc-bundle-card--sub-highlight' : ''}`}
                    >
                        {b.badge && (
                            <StampBadge text={b.badge} color={b.highlight ? '#7A2331' : '#C9963C'} />
                        )}
                        <div
                            className="oc-bundle-card__img-wrap"
                            style={{ cursor: 'pointer' }}
                            onClick={() => onSelectProduct?.(b)}
                        >
                            <img src={b.img} alt={b.flavor} loading="lazy" />
                        </div>

                        <h3 style={{ cursor: 'pointer' }} onClick={() => onSelectProduct?.(b)}>
                            {b.flavor}
                        </h3>
                        <p className="oc-bundle-card__desc">{b.desc}</p>

                        <div className="oc-bundle-option-pill">
                            <span>📌 {b.optionNotice}</span>
                        </div>

                        <div className="oc-bundle-card__price-box">
                            <div className="price">
                                <span className="oc-num">{b.price.toLocaleString('ko-KR')}원</span>
                                <s className="oc-num">{b.listPrice.toLocaleString('ko-KR')}원</s>
                            </div>
                            <span className="oc-bundle-card__unit">
                                개당 <s style={{ opacity: 0.5, fontWeight: 'normal' }}>1,250원</s> ➔ <strong>{b.unitPrice.toLocaleString('ko-KR')}원</strong>
                            </span>
                        </div>

                        <div className="oc-bundle-btn-group">
                            <button
                                className="oc-cta-outline oc-bundle-detail-btn"
                                onClick={() => onSelectProduct?.(b)}
                            >
                                <span>상세보기</span>
                            </button>

                            <button
                                className={`oc-cta-fill ${b.highlight ? 'oc-cta-fill--gold' : ''}`}
                                onClick={() => onSelectProduct?.(b)}
                            >
                                <ShoppingBag size={16} />
                                <span>세트로 담기</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export interface JournalArticle {
    id: string;
    title: string;
    subtitle: string;
    category: string;
    tag: string;
    readTime: string;
    date: string;
    author: string;
    img: string;
    intro: string;
    sections: {
        title: string;
        body: string;
        tip?: string;
    }[];
    conclusion: string;
}

export const JOURNAL_ARTICLES: JournalArticle[] = [
    {
        id: 'journal-1',
        title: '혈당 스파이크 없는 30초 아침 식단 가이드',
        subtitle: '바쁜 아침, 속이 편하고 포만감이 오래가는 복합 탄수화물과 귀리의 영양학적 비밀.',
        category: '혈당케어',
        tag: '#혈당케어 #아침건강',
        readTime: '3 min read',
        date: '2026.08.15',
        author: '오트케어 영양 연구팀',
        img: '/assets/journal-healthy-morning.png',
        intro: '아침 출근길, 빵 한 조각이나 시리얼로 대충 떼운 뒤 점심시간 전 미친 듯이 쏟아지는 졸음과 허기짐을 느껴보셨나요? 이는 정제 탄수화물이 초래하는 대표적인 혈당 스파이크 현상입니다.',
        sections: [
            {
                title: '1. 정제 탄수화물 vs 복합 탄수화물의 차이',
                body: '밀가루빵이나 달콤한 시리얼은 흡수가 빨라 혈당을 급격히 올렸다가 뚝 떨어뜨립니다. 반면 귀리(Oat)와 국산 9가지 통곡물은 복합 탄수화물로 흡수가 완만하여 온종일 안정적인 에너지 공급을 유지해 줍니다.',
                tip: '💡 팁: 아침 식단에 수용성 식이섬유(베타글루칸)가 풍부한 통곡물을 섭취하면 점심 식사 후 혈당 반응까지 완화됩니다.'
            },
            {
                title: '2. 귀리의 수용성 식이섬유, 베타글루칸(Beta-Glucan)',
                body: '오트케어의 핵심 원료인 귀리에는 젤 형태로 변해 섭취한 음식을 감싸는 베타글루칸이 풍부합니다. 이 성분이 당 흡수 속도를 늦추고 장내 유익균의 먹이가 되어 아침 편안함을 유지해 줍니다.',
            },
            {
                title: '3. 바쁜 아침 30초면 완성되는 혈당 케어 루틴',
                body: '따뜻한 물이나 저지방 우유 180ml에 오트케어 1포를 붓고 저어주기만 하면, 혈당 스파이크 부담 없는 완벽한 균형 한 끼가 완성됩니다.',
            }
        ],
        conclusion: '내 몸을 부드럽게 깨우는 아침 리추얼, 오트케어 한 포로 오늘 아침 혈당 밸런스를 지켜보세요.'
    },
    {
        id: 'journal-2',
        title: '우유 vs 두유 vs 아몬드유! 오트케어 맛별 환상 조합',
        subtitle: '그레인, 고구마, 서리태, 초코, 단백질! 어떤 꿀조합이 나에게 맞을까?',
        category: '꿀조합 레시피',
        tag: '#꿀조합 #맛별레시피',
        readTime: '4 min read',
        date: '2026.08.12',
        author: '오트케어 레시피 랩',
        img: '/assets/journal-oat-recipe-mix.png',
        intro: '오트케어의 5가지 맛은 붓는 음료에 따라 완전히 새로운 맛과 풍미를 선사합니다. 기분과 취향에 맞는 최고의 꿀조합을 소개합니다.',
        sections: [
            {
                title: '1. 시그니처 그레인 & 고구마 + 따뜻한 저지방 우유',
                body: '9가지 국산 곡물의 고소함과 고구마의 달콤함이 따뜻한 우유와 만나면 마치 전문 카페의 곡물 라떼나 정성 어린 미숫가루 같은 부드러움이 완성됩니다.',
                tip: '☕ 추천: 쌀쌀한 아침에는 따뜻하게 데운 우유 180ml에 섞어 드시면 속까지 따뜻해집니다.'
            },
            {
                title: '2. 서리태 & 단백질 + 무당 두유 (고단백 폭발)',
                body: '운동 직후나 고단백 식단이 필요한 날! 국산 서리태 검은콩 파우더에 무첨가 두유를 더하면 단백질 함량이 20g 이상으로 대폭 상승합니다.',
            },
            {
                title: '3. 리얼 초코 + 아몬드 브리즈 (길티프리 디저트)',
                body: '달콤한 디저트가 당길 때, 칼로리 부담 없는 아몬드유에 초코 오트케어를 타면 리얼 코코아의 풍미를 100kcal 대에 건강하게 즐기실 수 있습니다.',
            }
        ],
        conclusion: '매일 아침 다른 베이스 음료로 나만의 최애 오트케어 조합을 찾아보세요!'
    },
    {
        id: 'journal-3',
        title: '전날 밤 30초 준비로 완성하는 오버나이트 오트 꿀팁',
        subtitle: '아침 1초도 아까운 직장인과 수험생을 위한 전날 밤 오버나이트 오트 준비법.',
        category: '직장인 루틴',
        tag: '#직장인루틴 #오버나이트오트',
        readTime: '2 min read',
        date: '2026.08.10',
        author: '오트케어 라이프스타일',
        img: '/assets/journal-overnight-oats.png',
        intro: '아침 1분 1초가 시급해 아침을 건너뛰는 직장인과 수험생을 위한 스마트한 전날 밤 준비법, 바로 오버나이트 오트(Overnight Oats)입니다.',
        sections: [
            {
                title: '1. 30초 만에 끝나는 전날 밤 준비 과정',
                body: '밀폐 보틀에 오트케어 1포를 뜯고 우유나 우유 대체 음료 180ml를 부은 뒤 뚜껑을 닫고 냉장고에 넣어두기만 하면 끝입니다.',
                tip: '🌙 팁: 밤새 곡물 파우더가 촉촉하게 음료를 머금어 다음 날 훨씬 더 부드럽고 묵직한 크림 타입 푸딩 질감이 완성됩니다.'
            },
            {
                title: '2. 출근길에 챙겨서 가방에 쏙!',
                body: '아침에 일어난 뒤 냉장고에서 꺼내 가방에 넣기만 하세요. 이동 중이거나 사무실 책상에서 스푼으로 3초 만에 든든한 한 끼를 섭취할 수 있습니다.',
            }
        ],
        conclusion: '오늘 밤 30초 투자로 내일 아침의 여유와 건강을 챙겨보세요.'
    }
];

export const JournalArticleModal: React.FC<{
    article: JournalArticle | null;
    onClose: () => void;
}> = ({ article, onClose }) => {
    if (!article) return null;

    return (
        <div className="oc-modal-backdrop" onClick={onClose}>
            <div className="oc-journal-modal" onClick={(e) => e.stopPropagation()}>
                <button className="oc-modal-close-btn" onClick={onClose} aria-label="닫기">
                    <X size={20} />
                </button>

                <div className="oc-journal-modal__hero">
                    <img src={article.img} alt={article.title} />
                    <div className="oc-journal-modal__overlay">
                        <span className="oc-journal-modal__tag">{article.tag}</span>
                        <h2>{article.title}</h2>
                        <p className="oc-journal-modal__sub">{article.subtitle}</p>
                    </div>
                </div>

                <div className="oc-journal-modal__meta">
                    <span><User size={14} /> {article.author}</span>
                    <span><Clock size={14} /> {article.readTime}</span>
                    <span>{article.date}</span>
                </div>

                <div className="oc-journal-modal__body">
                    <p className="oc-journal-modal__intro">{article.intro}</p>

                    {article.sections.map((sec, idx) => (
                        <div key={idx} className="oc-journal-modal__section">
                            <h3>{sec.title}</h3>
                            <p>{sec.body}</p>
                            {sec.tip && <div className="oc-journal-modal__tip">{sec.tip}</div>}
                        </div>
                    ))}

                    <div className="oc-journal-modal__conclusion">
                        <p>{article.conclusion}</p>
                    </div>
                </div>

                <div className="oc-journal-modal__footer">
                    <button
                        className="oc-cta-fill"
                        style={{ width: '100%', justifyContent: 'center', padding: '0.9rem 1.5rem' }}
                        onClick={() => {
                            onClose();
                            const bundlesEl = document.getElementById('bundles');
                            if (bundlesEl) {
                                bundlesEl.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                    >
                        <ShoppingBag size={18} />
                        <span>가이드에 소개된 오트케어 세트 보러가기</span>
                    </button>

                    <div className="oc-journal-modal__blog-link">
                        <a
                            href="https://blog.naver.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="oc-cta-link"
                            style={{ fontSize: '0.85rem' }}
                        >
                            <span>오트케어 공식 블로그에서 전체 아티클 보기</span>
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ContentTeaser: React.FC = () => {
    const [selectedArticle, setSelectedArticle] = useState<JournalArticle | null>(null);

    return (
        <div className="oc-band oc-band--tan">
            <section className="oc-section" id="content">
                <div className="oc-section-header">
                    <span className="oc-eyebrow">From the Morning Journal</span>
                    <h2>오트케어의 <span className="oc-highlight-maroon">아침 이야기</span></h2>
                    <p className="oc-section-subhead">
                        바쁜 현대인을 위한 <span className="oc-highlight-gold">건강한 아침 식단 팁</span>과 <span className="oc-highlight-maroon">오트케어 활용 레시피</span>를 전합니다.
                    </p>
                </div>

                <div className="oc-journal-grid">
                    {JOURNAL_ARTICLES.map((article) => (
                        <div
                            key={article.id}
                            className="oc-journal-card"
                            onClick={() => setSelectedArticle(article)}
                        >
                            <div className="oc-journal-card__img-wrap">
                                <img src={article.img} alt={article.title} loading="lazy" />
                                <span className="oc-journal-card__badge">{article.readTime}</span>
                            </div>

                            <div className="oc-journal-card__body">
                                <span className="oc-journal-card__category">{article.tag}</span>
                                <h3>{article.title}</h3>
                                <p>{article.subtitle}</p>

                                <div className="oc-journal-card__footer">
                                    <span className="oc-journal-card__date">{article.date}</span>
                                    <span className="oc-journal-card__read-btn">
                                        아티클 읽기 <ArrowRight size={14} />
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <JournalArticleModal
                article={selectedArticle}
                onClose={() => setSelectedArticle(null)}
            />
        </div>
    );
};

export interface FinalCtaProps {
    onOpenDrawer?: (tab?: 'single' | 'bundle') => void;
}

export const FinalCta: React.FC<FinalCtaProps> = ({ onOpenDrawer }) => {
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.15 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section className="oc-section" id="final-cta">
            <div
                ref={cardRef}
                className={`oc-final-cta ${isVisible ? 'is-visible' : ''}`}
            >
                <div className="oc-final-cta-bg-zoom" />
                <div className="oc-final-cta-overlay" />
                <div className="oc-final-cta-content" style={{ position: 'relative', zIndex: 2 }}>
                    <span className="oc-eyebrow" style={{ color: 'var(--oc-gold)' }}>
                        Start Tomorrow Morning
                    </span>
                    <h2>
                        당신의 아침을,<br />
                        <span className="oc-highlight-gold">오트케어</span>와 함께 시작하세요
                    </h2>
                    <p style={{ color: 'rgba(247,241,228,0.92)', fontSize: '1.1rem', marginBottom: '2rem' }}>
                        첫 구매 시 전용 쉐이커 전원 증정 & 무료 배송 혜택
                    </p>
                    <button
                        className="oc-cta-fill"
                        onClick={() => onOpenDrawer?.('single')}
                        style={{ background: 'var(--oc-gold)', color: 'var(--oc-brown)', padding: '1rem 2.5rem', fontSize: '1.1rem', cursor: 'pointer', border: 'none' }}
                    >
                        <ShoppingBag size={20} />
                        <span>지금 할인 가격에 만나보기</span>
                    </button>
                </div>
            </div>
        </section>
    );
};

export interface FooterProps {
    onOpenLegal?: (type: 'privacy' | 'terms' | 'license') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal }) => {
    return (
        <footer className="oc-footer">
            <div className="oc-footer__brand">
                <div className="oc-footer__logo-header">
                    <img src="/assets/oatcare-logo.png" alt="오트케어 로고" className="oc-footer__logo-img" />
                    <strong>OatCare 오트케어</strong>
                </div>

                <div className="oc-footer__legal-links">
                    <button
                        className="oc-legal-btn oc-footer__legal-bold"
                        onClick={() => onOpenLegal?.('privacy')}
                    >
                        개인정보처리방침
                    </button>
                    <span>|</span>
                    <button
                        className="oc-legal-btn"
                        onClick={() => onOpenLegal?.('terms')}
                    >
                        이용약관
                    </button>
                    <span>|</span>
                    <button
                        className="oc-legal-btn"
                        onClick={() => onOpenLegal?.('license')}
                    >
                        사업자정보확인
                    </button>
                </div>

                <div className="oc-footer__info">
                    <span>상호: 우리종합식품 | 대표자: 윤영필 | 개인정보보호책임자: 윤영필</span>
                    <span>사업자등록번호: 850-27-00983 | 통신판매업신고: 2021-경기김포-3077</span>
                    <span>주소 (반품처): 경기도 김포시 양촌읍 황금1로 2-71</span>
                </div>

                <p className="oc-footer__copyright">© 2026 우리종합식품. All rights reserved.</p>
            </div>

            <div className="oc-footer__contact">
                <span className="oc-footer__cs-tag">고객센터 / CS Center</span>
                <strong className="oc-footer__phone">031-998-7234</strong>
                <p className="oc-footer__cs-hours">
                    운영시간: 평일 09:00 ~ 18:00 (점심 12:00 ~ 13:00)<br />
                    주말 및 공휴일 휴무 | 문의: yyp0606@naver.com
                </p>
                <div className="oc-footer__escrow-box">
                    <span>🛡️ <strong>구매안전서비스 (에스크로)</strong></span>
                    <p>고객님의 안전거래를 위해 현금 결제 시 구매안전서비스를 이용하실 수 있습니다.</p>
                </div>
            </div>
        </footer>
    );
};
