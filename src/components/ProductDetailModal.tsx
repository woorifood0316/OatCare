'use client';

import React from 'react';
import { X, ShoppingBag, Check, Star, Flame, Sparkles, Heart, ShieldCheck, ArrowRight } from 'lucide-react';
import { getAssetUrl } from '../utils/assets';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export interface ProductDetailItem {
    flavor: string;
    icon: string;
    badge?: string;
    tag: string;
    img: string;
    price: number;
    listPrice: number;
    ingredient: string;
    calories: string;
    accentColor: string;
    desc: string;
    tasteNote: string;
    mood: string;
    shakeColor: string;
}

interface ProductDetailModalProps {
    product: ProductDetailItem | null;
    onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
    const [quantity, setQuantity] = React.useState(1);
    const [activeTab, setActiveTab] = React.useState<'specs' | 'recipe' | 'reviews'>('specs');
    const [addedToast, setAddedToast] = React.useState(false);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useBodyScrollLock(!!product);

    if (!product) return null;

    const totalPrice = product.price * quantity;

    const handleAddToCart = () => {
        setAddedToast(true);
        setTimeout(() => setAddedToast(false), 2500);
    };

    return (
        <div className="oc-modal-backdrop" onClick={onClose}>
            <div className="oc-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Close Button */}
                <button className="oc-modal-close-btn" onClick={onClose} aria-label="닫기">
                    <X size={20} />
                </button>

                {/* Toast Message */}
                {addedToast && (
                    <div className="oc-modal-toast">
                        <Check size={18} />
                        <span>[오트케어 {product.flavor}] {quantity}개가 장바구니에 담겼습니다!</span>
                    </div>
                )}

                <div className="oc-modal-content-grid">
                    {/* Left Column: Image & Aura Stage */}
                    <div className="oc-modal-img-stage" style={{ '--stage-accent': product.accentColor } as React.CSSProperties}>
                        <div className="oc-modal-stage-glow" />
                        {product.badge && <span className="oc-modal-badge">{product.badge}</span>}

                        <div className="oc-modal-img-wrap">
                            <img src={getAssetUrl(product.img)} alt={`오트케어 ${product.flavor}`} className="oc-modal-pouch-img" />
                        </div>

                        <div className="oc-modal-flavor-pills">
                            <span className="pill"><Flame size={13} /> {product.calories}</span>
                            <span className="pill"><Sparkles size={13} /> 식이섬유 4.2g</span>
                            <span className="pill"><Heart size={13} /> 당류 3.5g</span>
                        </div>
                    </div>

                    {/* Right Column: Details & Ordering */}
                    <div className="oc-modal-info-col">
                        <div className="oc-modal-header">
                            <span className="oc-modal-eyebrow">{product.tag}</span>
                            <h2>{product.icon} 오트케어 {product.flavor}</h2>
                            <p className="oc-modal-taste-note">"{product.tasteNote}"</p>
                        </div>

                        {/* Rating Row */}
                        <div className="oc-modal-rating-row">
                            <div className="stars">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={15} fill="#C9963C" color="#C9963C" />
                                ))}
                            </div>
                            <span className="score">4.9</span>
                            <span className="count">(5,400+ 후기 검증)</span>
                        </div>

                        {/* Price Row */}
                        <div className="oc-modal-price-box">
                            {product.listPrice > product.price && (
                                <div className="disc-badge">
                                    -{Math.round((1 - product.price / product.listPrice) * 100)}%
                                </div>
                            )}
                            <div className="price-val">{product.price.toLocaleString('ko-KR')}원</div>
                            {product.listPrice > product.price && (
                                <s className="list-val">{product.listPrice.toLocaleString('ko-KR')}원</s>
                            )}
                            <span className="per-pouch">
                                {product.flavor.includes('세트') || product.flavor.includes('박스') ? '' : '/ 1포 (50g)'}
                            </span>
                        </div>

                        {/* Internal Navigation Tabs */}
                        <div className="oc-modal-tabs">
                            <button
                                className={`tab-btn ${activeTab === 'specs' ? 'is-active' : ''}`}
                                onClick={() => setActiveTab('specs')}
                            >
                                제품 특징 & 성분
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'recipe' ? 'is-active' : ''}`}
                                onClick={() => setActiveTab('recipe')}
                            >
                                맛있게 먹는 3가지법
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'reviews' ? 'is-active' : ''}`}
                                onClick={() => setActiveTab('reviews')}
                            >
                                실사용자 후기
                            </button>
                        </div>

                        {/* Tab Content 1: Specs */}
                        {activeTab === 'specs' && (
                            <div className="oc-modal-tab-panel">
                                <p className="desc">{product.desc}</p>
                                <ul className="spec-list">
                                    <li>
                                        <strong>핵심 곡물:</strong> {product.ingredient}
                                    </li>
                                    <li>
                                        <strong>용량/포장:</strong> 50g 이지컷 가방 속 휴대용 파우치
                                    </li>
                                    <li>
                                        <strong>보관 방법:</strong> 직사광선을 피한 서늘한 곳 상온 보관
                                    </li>
                                    <li>
                                        <strong>안심 유통:</strong> HACCP 인증 시설 제조 · 화학 첨가물 ZERO
                                    </li>
                                </ul>
                            </div>
                        )}

                        {/* Tab Content 2: Recipe */}
                        {activeTab === 'recipe' && (
                            <div className="oc-modal-tab-panel">
                                <div className="recipe-cards-grid">
                                    <div className="recipe-card">
                                        <span className="r-icon">💧</span>
                                        <div>
                                            <strong>담백한 물 180ml</strong>
                                            <p>깔끔하고 맑은 곡물 본연의 순수한 고소함</p>
                                        </div>
                                    </div>
                                    <div className="recipe-card">
                                        <span className="r-icon">🥛</span>
                                        <div>
                                            <strong>고소한 우유 180ml</strong>
                                            <p>풍부한 진한 부드러움, 곡물 라떼 느낌 선사</p>
                                        </div>
                                    </div>
                                    <div className="recipe-card">
                                        <span className="r-icon">🌱</span>
                                        <div>
                                            <strong>아몬드유/두유 180ml</strong>
                                            <p>극강의 다이어트 고단백 & 풍미 업그레이드</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Content 3: Reviews */}
                        {activeTab === 'reviews' && (
                            <div className="oc-modal-tab-panel">
                                <div className="modal-review-quote">
                                    <p>"출근길 지하철에서 물 부어 마시는데 진짜 고소해요. 공복감이 싹 사라지고 아침마다 몸이 가볍습니다."</p>
                                    <span className="author">김*진 (32세 직장인 · 3개월째 재구매)</span>
                                </div>
                            </div>
                        )}

                        {/* Quantity Selector */}
                        <div className="oc-modal-qty-row">
                            <span className="label">구매 수량 선택</span>
                            <div className="qty-picker">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                                <span>{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)}>+</button>
                            </div>
                        </div>

                        {/* Total Price & Action Buttons */}
                        <div className="oc-modal-action-bar">
                            <div className="total-wrap">
                                <span className="total-lbl">총 결제 금액</span>
                                <strong className="total-val">{totalPrice.toLocaleString('ko-KR')}원</strong>
                            </div>
                            <div className="btn-group">
                                <button className="oc-cta-outline modal-cart-btn" onClick={handleAddToCart}>
                                    <ShoppingBag size={18} />
                                    <span>장바구니 담기</span>
                                </button>
                                <button className="oc-cta-fill modal-buy-btn" onClick={() => alert(`[오트케어 ${product.flavor}] ${quantity}개 주문 페이지로 이동합니다!`)}>
                                    <span>바로 구매하기</span>
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
