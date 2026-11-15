'use client';

// One purchase sheet for the whole shop. It rises from the bottom on phones and opens in the centre on wide screens,
// and the same sheet is used from every entry point; only where it starts differs:
//  - home "지금 구매하기": the product list (세트 | 낱개) first
//  - a home card's "바로구매": that product, already selected, at its options
//  - a product page's buy buttons: that product's options (일반 구매 / 정기구독 as the button pressed)
// The phone back button closes the sheet (not the page) and the page stays where it was.

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, Minus, Plus, Repeat, ShoppingBag, X, Zap } from 'lucide-react';
import { useCart } from '../cart/CartProvider';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { CouponHint } from './CouponHint';
import { useMixChoice } from './MixPicker';
import { SinglesPicker } from './SinglesBar';
import { getAssetUrl } from '../../utils/assets';
import { PRODUCT_PAGES, SET_PAGES } from '../../lib/products';
import {
    CYCLE_OPTIONS,
    MIN_SUBSCRIPTION_CHARGES,
    SUBSCRIPTION_DISCOUNT_RATE,
    getItem,
    subscriptionUnitPrice,
    type CartLine,
} from '../../lib/catalog';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export type BuyMode = 'once' | 'subscribe';
export type BuyTarget = { kind: 'list'; tab?: 'set' | 'single' } | { kind: 'set'; sku: string; mode?: BuyMode } | { kind: 'single'; flavor: string };

const OPEN_BUY_EVENT = 'oc:buy';
/** Open the purchase sheet from anywhere on a page that mounts <BuySheetHost />. */
export function openBuy(target: BuyTarget) {
    window.dispatchEvent(new CustomEvent<BuyTarget>(OPEN_BUY_EVENT, { detail: target }));
}

/**
 * The sheet's frame: overlay, card, scroll lock, and the phone back button. `children` gets `close`, which every
 * close button must use (it also takes the sheet's history entry away).
 */
export function SheetFrame({ label, onClose, children }: { label: string; onClose: () => void; children: (close: () => void) => React.ReactNode }) {
    useBodyScrollLock(true);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // One history entry while open: the phone's back button closes the sheet instead of leaving the page.
        window.history.pushState({ ...(window.history.state ?? {}), ocSheet: true }, '');
        const onPop = () => onCloseRef.current();
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    const close = () => {
        if (window.history.state?.ocSheet) window.history.back();
        else onCloseRef.current();
    };

    if (!mounted) return null;
    return createPortal(
        <div className="sbar-sheet" role="dialog" aria-modal="true" aria-label={label} onClick={close}>
            <div className="sbar-sheet__card" onClick={(e) => e.stopPropagation()}>
                {children(close)}
            </div>
        </div>,
        document.body,
    );
}

/** Small product line at the top of a sheet, so it is always clear what is being bought. */
function SheetProduct({ img, name, sub }: { img: string; name: string; sub: string }) {
    return (
        <div className="bs-product">
            <img src={getAssetUrl(img)} alt="" />
            <div>
                <strong>{name}</strong>
                <span>{sub}</span>
            </div>
        </div>
    );
}

function SheetTop({ title, onClose, onBack }: { title: React.ReactNode; onClose: () => void; onBack?: () => void }) {
    return (
        <div className="sbar-sheet__head">
            {onBack ? (
                <button type="button" className="bs-back" onClick={onBack} aria-label="상품 목록으로">
                    <ChevronLeft size={20} />
                    <span>목록</span>
                </button>
            ) : null}
            <div className="bs-title">{title}</div>
            <button type="button" className="sbar-sheet__close" onClick={onClose} aria-label="닫기">
                <X size={20} />
            </button>
        </div>
    );
}

/**
 * A set's options inside the sheet: 일반 구매 / 정기구독 (20·30), flavour mix, quantity or delivery cycle, total and
 * the buttons. The state (quantity, mix) belongs to the caller, so a product page shares it with its inline picker.
 */
export function SetBuyBody({
    sku,
    initialMode = 'once',
    qty,
    setQty,
    mixChoice,
    mixErr,
    mixPicker,
    onClose,
    onBack,
}: {
    sku: string;
    initialMode?: BuyMode;
    qty: number;
    setQty: (n: number) => void;
    mixChoice: Pick<CartLine, 'mix' | 'mixDetail'>;
    mixErr: string | null;
    mixPicker: React.ReactNode;
    onClose: () => void;
    onBack?: () => void;
}) {
    const router = useRouter();
    const { addLine, buyNow } = useCart();
    const item = getItem(sku);
    const page = SET_PAGES.find((s) => s.sku === sku);
    const subscribable = Boolean(item?.subscribable);
    const [mode, setMode] = useState<BuyMode>(subscribable ? initialMode : 'once');
    const [cycle, setCycle] = useState<number | null>(null);
    const [added, setAdded] = useState(false);
    if (!item) return null;

    const pct = Math.round(SUBSCRIPTION_DISCOUNT_RATE * 100);
    const subPrice = subscriptionUnitPrice(item);
    const saving = item.price - subPrice;
    const effectiveCycle = cycle ?? item.count;
    const clamp = (n: number) => Math.min(99, Math.max(1, n));
    const unit = Math.round(item.price / item.count);

    const addCart = () => {
        if (mixErr) return;
        addLine({ sku, qty, mode: 'once', ...mixChoice });
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };
    const buy = async () => {
        if (mixErr) return;
        const dest = await buyNow({ sku, qty, mode: 'once', ...mixChoice });
        router.push(dest === 'checkout' ? '/checkout?type=once' : '/cart');
    };
    const subscribe = () => {
        if (mixErr) return;
        addLine({ sku, qty: 1, mode: 'subscribe', cycleDays: effectiveCycle, ...mixChoice });
        router.push('/cart');
    };

    return (
        <>
            <SheetTop title={subscribable ? '구매 방식 선택' : '수량 선택'} onClose={onClose} onBack={onBack} />
            <SheetProduct img={page?.img ?? item.img ?? ''} name={item.name} sub={`${won(item.price)} · 개당 ${won(unit)} · 무료배송`} />

            {subscribable ? (
                <div className="sbar-sheet__modes" role="tablist" aria-label="구매 방식">
                    <button type="button" role="tab" aria-selected={mode === 'once'} className={mode === 'once' ? 'is-active' : ''} onClick={() => setMode('once')}>
                        일반 구매
                    </button>
                    <button type="button" role="tab" aria-selected={mode === 'subscribe'} className={mode === 'subscribe' ? 'is-active' : ''} onClick={() => setMode('subscribe')}>
                        정기구독 {pct}%↓
                        <span className="bs-tab-badge">첫 회 보틀 증정</span>
                    </button>
                </div>
            ) : null}

            {mixPicker ? <div className="sbar-sheet__mixbox">{mixPicker}</div> : null}

            {mode === 'once' ? (
                <>
                    <div className="sbar-sheet__row">
                        <span>수량</span>
                        <div className="pd-qty__ctl">
                            <button type="button" onClick={() => setQty(clamp(qty - 1))} aria-label="수량 줄이기">
                                <Minus size={15} />
                            </button>
                            <input type="number" inputMode="numeric" min={1} max={99} value={qty} onChange={(e) => setQty(clamp(Number(e.target.value) || 1))} aria-label="수량" />
                            <button type="button" onClick={() => setQty(clamp(qty + 1))} aria-label="수량 늘리기">
                                <Plus size={15} />
                            </button>
                        </div>
                    </div>
                    <div className="sbar-sheet__total">
                        <span>합계 (무료배송)</span>
                        <b>{won(item.price * qty)}</b>
                    </div>
                    <CouponHint mode="once" count={item.count * qty} noMinimum={subscribable} compact />
                    <div className="pd-actions">
                        <button type="button" className="pd-btn pd-btn--cart" onClick={addCart} disabled={!!mixErr}>
                            <ShoppingBag size={17} />
                            <span>{added ? '담았어요 ✓' : '장바구니 담기'}</span>
                        </button>
                        <button type="button" className="pd-btn pd-btn--buy" onClick={buy} disabled={!!mixErr}>
                            <Zap size={17} />
                            <span>바로 구매</span>
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <label className="sbar-sheet__row">
                        <span>배송 주기</span>
                        <select value={effectiveCycle} onChange={(e) => setCycle(Number(e.target.value))}>
                            {CYCLE_OPTIONS.map((d) => (
                                <option key={d} value={d}>
                                    {d}일마다{d === item.count ? ' (추천)' : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="sbar-sheet__total">
                        <span>매회 결제 (무료배송)</span>
                        <b>
                            <s>{won(item.price)}</s> {won(subPrice)}
                        </b>
                    </div>
                    <ul className="sbar-sheet__perks">
                        <li>
                            <Check size={14} aria-hidden="true" /> 매회 <b>{pct}% 추가 할인</b> ({won(saving)} 절약)
                        </li>
                        <li>
                            <Check size={14} aria-hidden="true" /> 첫 회 <b>쉐이커 보틀 증정</b>
                        </li>
                        <li>
                            <Check size={14} aria-hidden="true" /> 마이페이지에서 <b>주기 변경·건너뛰기</b>
                        </li>
                    </ul>
                    <CouponHint mode="subscribe" count={item.count} noMinimum total={subPrice} compact />
                    <button type="button" className="pc2__start" onClick={subscribe} disabled={!!mixErr}>
                        <Repeat size={16} />
                        <span>정기구독 시작하기</span>
                    </button>
                    <p className="pc2__min">
                        <b>최소 {MIN_SUBSCRIPTION_CHARGES}회 이용</b> · 결제일 기준으로 결제·발송
                    </p>
                </>
            )}
        </>
    );
}

/** A set opened from the home page: its own quantity and mix. */
function SetFor({ sku, mode, onClose, onBack }: { sku: string; mode?: BuyMode; onClose: () => void; onBack?: () => void }) {
    const [qty, setQty] = useState(1);
    const { mixChoice, mixErr, picker } = useMixChoice(sku);
    return <SetBuyBody sku={sku} initialMode={mode} qty={qty} setQty={setQty} mixChoice={mixChoice} mixErr={mixErr} mixPicker={picker} onClose={onClose} onBack={onBack} />;
}

/** Single flavours: pick any of the five, one sachet at a time (the chosen flavour starts at 1). */
export function SinglesBody({ flavor, onClose, onBack }: { flavor: string; onClose: () => void; onBack?: () => void }) {
    return (
        <>
            <SheetTop
                title={
                    <strong className="sgl__title">
                        낱개 골라 담기 <small>1개 단위 · 여러 맛 섞기 가능</small>
                    </strong>
                }
                onClose={onClose}
                onBack={onBack}
            />
            <SinglesPicker flavor={flavor} onDone={onClose} />
        </>
    );
}

/** The product list (home "지금 구매하기"): compare, then pick one. */
function ProductList({ tab, setTab, pick, onClose }: { tab: 'set' | 'single'; setTab: (t: 'set' | 'single') => void; pick: (t: BuyTarget) => void; onClose: () => void }) {
    return (
        <>
            <SheetTop title="상품 고르기" onClose={onClose} />
            <div className="sbar-sheet__modes" role="tablist" aria-label="상품 종류">
                <button type="button" role="tab" aria-selected={tab === 'set'} className={tab === 'set' ? 'is-active' : ''} onClick={() => setTab('set')}>
                    세트
                </button>
                <button type="button" role="tab" aria-selected={tab === 'single'} className={tab === 'single' ? 'is-active' : ''} onClick={() => setTab('single')}>
                    낱개 (맛별)
                </button>
            </div>
            <p className="bs-note">{tab === 'set' ? '세트는 모두 무료배송이에요' : '낱개는 여러 맛을 섞어 20개(한 박스)부터 무료배송이에요'}</p>
            <ul className="bs-list">
                {tab === 'set'
                    ? SET_PAGES.map((s) => {
                          const it = getItem(s.sku)!;
                          return (
                              <li key={s.sku}>
                                  <button type="button" onClick={() => pick({ kind: 'set', sku: s.sku })}>
                                      <img src={getAssetUrl(s.img)} alt="" />
                                      <span className="bs-list__name">
                                          <b>{it.name}</b>
                                          <small>{it.subscribable ? `정기구독 ${Math.round(SUBSCRIPTION_DISCOUNT_RATE * 100)}%↓ 가능` : '5가지 맛 각 2포'}</small>
                                      </span>
                                      <span className="bs-list__price">
                                          <b>{won(it.price)}</b>
                                          <small>개당 {won(Math.round(it.price / it.count))}</small>
                                      </span>
                                  </button>
                              </li>
                          );
                      })
                    : PRODUCT_PAGES.map((p) => {
                          const it = getItem(p.sku)!;
                          return (
                              <li key={p.sku}>
                                  <button type="button" onClick={() => pick({ kind: 'single', flavor: p.flavor })}>
                                      <img src={getAssetUrl(p.img)} alt="" />
                                      <span className="bs-list__name">
                                          <b>{p.flavor}</b>
                                          <small>{p.tagline}</small>
                                      </span>
                                      <span className="bs-list__price">
                                          <b>{won(it.price)}</b>
                                          <small>1개</small>
                                      </span>
                                  </button>
                              </li>
                          );
                      })}
            </ul>
            <p className="bs-note bs-note--foot">상품을 누르면 이 창에서 바로 옵션을 골라요. 자세한 설명은 상품 상세에서 볼 수 있어요.</p>
        </>
    );
}

/** Mounted once on pages whose buttons call openBuy(): the home page. */
export function BuySheetHost() {
    const [target, setTarget] = useState<BuyTarget | null>(null);
    const [fromList, setFromList] = useState(false);
    const [tab, setTab] = useState<'set' | 'single'>('set');

    useEffect(() => {
        const onOpen = (e: Event) => {
            const t = (e as CustomEvent<BuyTarget>).detail;
            setFromList(false);
            if (t.kind === 'list') setTab(t.tab ?? 'set');
            setTarget(t);
        };
        window.addEventListener(OPEN_BUY_EVENT, onOpen);
        return () => window.removeEventListener(OPEN_BUY_EVENT, onOpen);
    }, []);

    if (!target) return null;
    const pick = (t: BuyTarget) => {
        setFromList(true);
        setTarget(t);
    };
    const back = fromList ? () => setTarget({ kind: 'list', tab }) : undefined;

    return (
        <SheetFrame label={target.kind === 'list' ? '상품 고르기' : '구매하기'} onClose={() => setTarget(null)}>
            {(close) =>
                target.kind === 'list' ? (
                    <ProductList tab={tab} setTab={setTab} pick={pick} onClose={close} />
                ) : target.kind === 'set' ? (
                    <SetFor key={target.sku} sku={target.sku} mode={target.mode} onClose={close} onBack={back} />
                ) : (
                    <SinglesBody key={target.flavor} flavor={target.flavor} onClose={close} onBack={back} />
                )
            }
        </SheetFrame>
    );
}
