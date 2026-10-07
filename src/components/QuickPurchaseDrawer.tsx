'use client';

import React, { useState } from 'react';
import { X, ShoppingBag, Plus, Minus, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RICH_PRODUCTS, BUNDLES } from './Sections';
import { useCart } from './cart/CartProvider';
import {
    CATALOG,
    CYCLE_OPTIONS,
    MIN_SUBSCRIPTION_CHARGES,
    SUBSCRIPTION_DISCOUNT_RATE,
    getItem,
    subscriptionUnitPrice,
    type CartLine,
} from '../lib/catalog';
import { slugForFlavor } from '../lib/products';
import { useMixChoice } from './purchase/MixPicker';
import { getAssetUrl } from '../utils/assets';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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
    const [purchaseMode, setPurchaseMode] = useState<'once' | 'subscribe'>('once');
    const [cycleDays, setCycleDays] = useState<number | null>(null);

    const router = useRouter();
    const { addLine, buyNow } = useCart();
    const mix = useMixChoice(`bundle:${selectedBundleId}`);

    useBodyScrollLock(isOpen);

    if (!isOpen) return null;

    // Single item calculation
    const totalSingleCount = Object.values(singleQty).reduce((acc, q) => acc + q, 0);
    const single = getItem('single:그레인')!;
    const totalSinglePrice = totalSingleCount * single.price;
    const totalSingleListPrice = totalSingleCount * single.listPrice;
    const singlePct = Math.round((1 - single.price / single.listPrice) * 100);
    const bundleItems = CATALOG.filter((i) => i.kind === 'bundle');
    const maxBundlePct = Math.max(...bundleItems.map((i) => Math.round((1 - i.price / i.listPrice) * 100)));
    const minUnit = Math.min(...bundleItems.map((i) => Math.round(i.price / i.count)));

    // Bundle calculation
    const currentBundle = BUNDLES.find((b) => b.count === selectedBundleId) || BUNDLES[1];
    const totalBundlePrice = currentBundle.price;

    const handleQtyChange = (flavor: string, delta: number) => {
        setSingleQty((prev) => {
            const next = Math.max(0, (prev[flavor] || 0) + delta);
            return { ...prev, [flavor]: next };
        });
    };

    const bundleItem = getItem(`bundle:${currentBundle.count}`);
    const canSubscribe = Boolean(bundleItem?.subscribable);
    const isSubscribe = activeTab === 'bundle' && canSubscribe && purchaseMode === 'subscribe';
    const effectiveCycle = cycleDays ?? currentBundle.count;
    const subUnit = bundleItem ? subscriptionUnitPrice(bundleItem) : currentBundle.price;

    const sku = `bundle:${currentBundle.count}`;
    const buildLines = (): CartLine[] | null => {
        if (activeTab === 'single') {
            if (totalSingleCount === 0) {
                alert('최소 1개 이상의 상품 수량을 선택해 주세요.');
                return null;
            }
            return Object.entries(singleQty)
                .filter(([, qty]) => qty > 0)
                .map(([flavor, qty]) => ({ sku: `single:${flavor}`, qty, mode: 'once' as const }));
        }
        if (mix.mixErr) {
            alert(mix.mixErr);
            return null;
        }
        if (isSubscribe) {
            return [{ sku, qty: 1, mode: 'subscribe', cycleDays: effectiveCycle, ...mix.mixChoice }];
        }
        return [{ sku, qty: 1, mode: 'once', ...mix.mixChoice }];
    };

    const handleAddToCart = () => {
        const lines = buildLines();
        if (!lines) return;
        lines.forEach((l) => addLine(l));
        onClose();
    };

    const handleCheckout = async () => {
        const lines = buildLines();
        if (!lines) return;
        if (isSubscribe) {
            // Subscriptions are reviewed in the cart (cycle, minimum-period notice) before payment.
            lines.forEach((l) => addLine(l));
            onClose();
            router.push('/cart');
            return;
        }
        const dest = await buyNow(lines);
        onClose();
        router.push(dest === 'checkout' ? '/checkout?type=once' : '/cart');
    };

    return (
        <div className="oc-drawer-backdrop" onClick={onClose}>
            <div className="oc-drawer" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="oc-drawer__header">
                    <div className="oc-drawer__title">
                        <ShoppingBag size={20} className="oc-drawer__icon" />
                        <div>
                            <h3>참오트케어 간편 구매</h3>
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
                        <span>🥛 1개입 단품 ({single.price.toLocaleString('ko-KR')}원)</span>
                    </button>
                    <button
                        className={`oc-drawer__tab ${activeTab === 'bundle' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('bundle')}
                    >
                        <span className="oc-drawer__tab-badge">최대 {maxBundlePct}% OFF</span>
                        <span>🎁 알뜰 세트 ({minUnit.toLocaleString('ko-KR')}원~)</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="oc-drawer__body">
                    {activeTab === 'single' ? (
                        <div className="oc-drawer__single-view">
                            <div className="oc-drawer__banner">
                                💡 <strong>단품 특가 {single.price.toLocaleString('ko-KR')}원</strong> (정가 {single.listPrice.toLocaleString('ko-KR')}원 대비 {singlePct}% 할인)
                            </div>

                            <div className="oc-drawer__items-list">
                                {RICH_PRODUCTS.map((p) => {
                                    const qty = singleQty[p.flavor] || 0;
                                    return (
                                        <div key={p.flavor} className={`oc-drawer-item ${qty > 0 ? 'is-selected' : ''}`}>
                                            <img src={getAssetUrl(p.img)} alt={p.flavor} className="oc-drawer-item__img" />

                                            <div className="oc-drawer-item__info">
                                                <div className="oc-drawer-item__title-row">
                                                    <strong>참오트케어 {p.flavor}</strong>
                                                    <span className="oc-drawer-item__kcal">{p.calories}</span>
                                                </div>
                                                <p className="oc-drawer-item__desc">{p.tasteNote}</p>
                                                <div className="oc-drawer-item__price-row">
                                                    <strong>{single.price.toLocaleString('ko-KR')}원</strong>
                                                    <s>{single.listPrice.toLocaleString('ko-KR')}원</s>
                                                </div>
                                                {slugForFlavor(p.flavor) ? (
                                                    <Link
                                                        href={`/products/${slugForFlavor(p.flavor)}`}
                                                        className="oc-drawer-item__more"
                                                        onClick={onClose}
                                                    >
                                                        상세보기 →
                                                    </Link>
                                                ) : null}
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
                                ⚡ <strong>세트 구매 시 전 수량 무료 배송 + 최대 {maxBundlePct}% 할인!</strong>
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
                                                    개당 <strong>{b.unitPrice.toLocaleString('ko-KR')}원</strong> (정가 {single.listPrice.toLocaleString('ko-KR')}원)
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

                            {mix.picker}

                            {canSubscribe ? (
                                <div className="oc-drawer__mix-option">
                                    <span>구매 방식</span>
                                    <div className="oc-drawer__mix-btns">
                                        <button
                                            className={purchaseMode === 'once' ? 'is-active' : ''}
                                            onClick={() => setPurchaseMode('once')}
                                        >
                                            한 번만 구매
                                        </button>
                                        <button
                                            className={purchaseMode === 'subscribe' ? 'is-active' : ''}
                                            onClick={() => setPurchaseMode('subscribe')}
                                        >
                                            🔁 정기구독 ({Math.round(SUBSCRIPTION_DISCOUNT_RATE * 100)}% 추가 할인 · 첫 회 쉐이커 보틀 증정)
                                        </button>
                                    </div>
                                    {purchaseMode === 'subscribe' ? (
                                        <label className="oc-drawer__cycle">
                                            배송 주기
                                            <select
                                                value={effectiveCycle}
                                                onChange={(e) => setCycleDays(Number(e.target.value))}
                                            >
                                                {CYCLE_OPTIONS.map((d) => (
                                                    <option key={d} value={d}>
                                                        {d}일마다{d === currentBundle.count ? ' (추천)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    ) : null}
                                    {purchaseMode === 'subscribe' ? (
                                        <p className="oc-drawer__min-note">
                                            ※ 정기구독은 <b>최소 {MIN_SUBSCRIPTION_CHARGES}회 이용(결제)</b> 후 해지할 수 있어요. 결제일 기준으로 결제·발송돼요.
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
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
                                <span className="oc-drawer__summary-lbl">
                                    {currentBundle.flavor} (무료배송){isSubscribe ? ` · ${effectiveCycle}일마다` : ''}
                                </span>
                                <div className="oc-drawer__summary-price">
                                    <strong>{(isSubscribe ? subUnit : totalBundlePrice).toLocaleString('ko-KR')}원</strong>
                                    <s>{currentBundle.listPrice.toLocaleString('ko-KR')}원</s>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="oc-drawer__actions">
                        <button className="oc-cta-outline oc-drawer__cart-btn" onClick={handleAddToCart}>
                            <ShoppingBag size={16} />
                            <span>장바구니</span>
                        </button>
                        <button
                            className="oc-cta-fill oc-drawer__checkout-btn"
                            onClick={handleCheckout}
                        >
                            <span>{isSubscribe ? '정기구독 시작' : '바로 구매하기'}</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
