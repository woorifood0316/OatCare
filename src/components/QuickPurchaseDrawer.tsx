'use client';

import React, { useState } from 'react';
import { X, ShoppingBag, Plus, Minus, Check, ArrowRight } from 'lucide-react';
import { RICH_PRODUCTS, BUNDLES } from './Sections';
import { getAssetUrl } from '../utils/assets';

interface QuickPurchaseDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'single' | 'bundle';
}

export const QuickPurchaseDrawer: React.FC<QuickPurchaseDrawerProps> = ({
    isOpen,
    onClose,
    initialTab = 'single',
}) => {
    const [activeTab, setActiveTab] = useState<'single' | 'bundle'>(initialTab);

    // Single items quantity state: { "그레인": 1, "고구마": 0, ... }
    const [singleQty, setSingleQty] = useState<{ [key: string]: number }>({
        '그레인': 1,
        '고구마': 0,
        '단백질': 0,
        '서리태': 0,
        '초코': 0,
    });

    // Bundle selection state
    const [selectedBundleId, setSelectedBundleId] = useState<number>(20); // Default 20-pack BEST
    const [bundleMixOption, setBundleMixOption] = useState<'all' | 'custom'>('all');

    if (!isOpen) return null;

    // Single item calculation
    const totalSingleCount = Object.values(singleQty).reduce((acc, q) => acc + q, 0);
    const totalSinglePrice = totalSingleCount * 1100;
    const totalSingleListPrice = totalSingleCount * 1250;

    // Bundle calculation
    const currentBundle = BUNDLES.find((b) => b.count === selectedBundleId) || BUNDLES[1];
    const totalBundlePrice = currentBundle.price;

    const handleQtyChange = (flavor: string, delta: number) => {
        setSingleQty((prev) => {
            const next = Math.max(0, (prev[flavor] || 0) + delta);
            return { ...prev, [flavor]: next };
        });
    };

    const handleCheckout = () => {
        if (activeTab === 'single') {
            if (totalSingleCount === 0) {
                alert('최소 1개 이상의 상품 수량을 선택해 주세요.');
                return;
            }
            alert(`[단품 주문] 총 ${totalSingleCount}개 (${totalSinglePrice.toLocaleString('ko-KR')}원) 주문 페이지로 이동합니다!`);
        } else {
            alert(`[세트 주문] ${currentBundle.flavor} (${currentBundle.price.toLocaleString('ko-KR')}원) 주문 페이지로 이동합니다!`);
        }
        onClose();
    };

    return (
        <div className="oc-drawer-backdrop" onClick={onClose}>
            <div className="oc-drawer" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="oc-drawer__header">
                    <div className="oc-drawer__title">
                        <ShoppingBag size={20} className="oc-drawer__icon" />
                        <div>
                            <h3>오트케어 간편 구매</h3>
                            <span>취향에 맞게 단품 또는 할인 세트를 선택하세요</span>
                        </div>
                    </div>
                    <button className="oc-drawer__close" onClick={onClose} aria-label="닫기">
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="oc-drawer__tabs">
                    <button
                        className={`oc-drawer__tab ${activeTab === 'single' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('single')}
                    >
                        <span>🥛 1개입 단품 (1,100원)</span>
                    </button>
                    <button
                        className={`oc-drawer__tab ${activeTab === 'bundle' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('bundle')}
                    >
                        <span className="oc-drawer__tab-badge">최대 28% OFF</span>
                        <span>🎁 알뜰 세트 (900원~)</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="oc-drawer__body">
                    {activeTab === 'single' ? (
                        <div className="oc-drawer__single-view">
                            <div className="oc-drawer__banner">
                                💡 <strong>단품 특가 1,100원</strong> (정가 1,250원 대비 12% 할인)
                            </div>

                            <div className="oc-drawer__items-list">
                                {RICH_PRODUCTS.map((p) => {
                                    const qty = singleQty[p.flavor] || 0;
                                    return (
                                        <div key={p.flavor} className={`oc-drawer-item ${qty > 0 ? 'is-selected' : ''}`}>
                                            <img src={getAssetUrl(p.img)} alt={p.flavor} className="oc-drawer-item__img" />

                                            <div className="oc-drawer-item__info">
                                                <div className="oc-drawer-item__title-row">
                                                    <strong>오트케어 {p.flavor}</strong>
                                                    <span className="oc-drawer-item__kcal">{p.calories}</span>
                                                </div>
                                                <p className="oc-drawer-item__desc">{p.tasteNote}</p>
                                                <div className="oc-drawer-item__price-row">
                                                    <strong>1,100원</strong>
                                                    <s>1,250원</s>
                                                </div>
                                            </div>

                                            <div className="oc-drawer-item__counter">
                                                <button
                                                    onClick={() => handleQtyChange(p.flavor, -1)}
                                                    disabled={qty === 0}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span>{qty}</span>
                                                <button onClick={() => handleQtyChange(p.flavor, 1)}>
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="oc-drawer__bundle-view">
                            <div className="oc-drawer__banner oc-drawer__banner--gold">
                                ⚡ <strong>세트 구매 시 전 수량 무료 배송 + 최대 28% 할인!</strong>
                            </div>

                            <div className="oc-drawer__bundle-cards">
                                {BUNDLES.map((b) => {
                                    const isSelected = selectedBundleId === b.count;
                                    return (
                                        <div
                                            key={b.count}
                                            className={`oc-drawer-bundle-card ${isSelected ? 'is-selected' : ''}`}
                                            onClick={() => setSelectedBundleId(b.count)}
                                        >
                                            <div className="oc-drawer-bundle-card__radio">
                                                <div className={`oc-radio-circle ${isSelected ? 'is-active' : ''}`}>
                                                    {isSelected && <Check size={12} />}
                                                </div>
                                            </div>

                                            <div className="oc-drawer-bundle-card__info">
                                                <div className="oc-drawer-bundle-card__head">
                                                    <strong>{b.flavor}</strong>
                                                    {b.badge && <span className="oc-badge-mini">{b.badge}</span>}
                                                </div>
                                                <p>{b.desc}</p>
                                                <div className="oc-drawer-bundle-card__unit">
                                                    개당 <strong>{b.unitPrice.toLocaleString('ko-KR')}원</strong> (정가 1,250원)
                                                </div>
                                            </div>

                                            <div className="oc-drawer-bundle-card__price">
                                                <strong>{b.price.toLocaleString('ko-KR')}원</strong>
                                                <s>{b.listPrice.toLocaleString('ko-KR')}원</s>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="oc-drawer__mix-option">
                                <span>맛 구성 선택</span>
                                <div className="oc-drawer__mix-btns">
                                    <button
                                        className={bundleMixOption === 'all' ? 'is-active' : ''}
                                        onClick={() => setBundleMixOption('all')}
                                    >
                                        ✨ 5가지 맛 골고루 혼합
                                    </button>
                                    <button
                                        className={bundleMixOption === 'custom' ? 'is-active' : ''}
                                        onClick={() => setBundleMixOption('custom')}
                                    >
                                        🌾 단일 맛 선택
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action Bar */}
                <div className="oc-drawer__footer">
                    <div className="oc-drawer__summary">
                        {activeTab === 'single' ? (
                            <div>
                                <span className="oc-drawer__summary-lbl">선택 상품 수량: <strong>{totalSingleCount}개</strong></span>
                                <div className="oc-drawer__summary-price">
                                    <strong>{totalSinglePrice.toLocaleString('ko-KR')}원</strong>
                                    {totalSingleCount > 0 && <s>{totalSingleListPrice.toLocaleString('ko-KR')}원</s>}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <span className="oc-drawer__summary-lbl">{currentBundle.flavor} (무료배송)</span>
                                <div className="oc-drawer__summary-price">
                                    <strong>{totalBundlePrice.toLocaleString('ko-KR')}원</strong>
                                    <s>{currentBundle.listPrice.toLocaleString('ko-KR')}원</s>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="oc-drawer__actions">
                        <button
                            className="oc-cta-fill oc-drawer__checkout-btn"
                            onClick={handleCheckout}
                        >
                            <span>바로 구매하기</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
