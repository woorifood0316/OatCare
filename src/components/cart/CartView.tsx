'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useCart } from './CartProvider';
import {
    CYCLE_OPTIONS,
    CartLine,
    FLAVORS,
    MIX_UNIT,
    SUBSCRIPTION_DISCOUNT_RATE,
    evenMix,
    getItem,
    lineKey,
    maxQty,
    mixError,
    priceCart,
    unitPriceOf,
} from '../../lib/catalog';
import { getAssetUrl } from '../../utils/assets';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

function MixEditor({ line }: { line: CartLine }) {
    const { setMix } = useCart();
    const item = getItem(line.sku);
    if (!item || !item.mixSelectable) return null;
    const key = lineKey(line);
    const custom = line.mix === 'custom';
    const detail = line.mixDetail ?? {};
    const total = FLAVORS.reduce((sum, f) => sum + (detail[f] ?? 0), 0);
    const err = mixError(line);

    const change = (flavor: string, delta: number) => {
        const next = { ...detail };
        for (const f of FLAVORS) next[f] = next[f] ?? 0;
        next[flavor] = Math.max(0, (next[flavor] ?? 0) + delta * MIX_UNIT);
        setMix(key, 'custom', next);
    };

    return (
        <div className="cart-mix">
            <div className="cart-mix__modes" role="group" aria-label="맛 구성">
                <button type="button" className={!custom ? 'is-active' : ''} onClick={() => setMix(key, 'all')}>
                    5가지 골고루
                </button>
                <button
                    type="button"
                    className={custom ? 'is-active' : ''}
                    onClick={() => setMix(key, 'custom', line.mixDetail ?? Object.fromEntries(FLAVORS.map((f) => [f, 0])))}
                >
                    맛 직접 선택
                </button>
            </div>

            {custom ? (
                <div className="cart-mix__editor">
                    {FLAVORS.map((f) => (
                        <div key={f} className="cart-mix__row">
                            <span>{f}</span>
                            <div className="cart-qty">
                                <button type="button" onClick={() => change(f, -1)} disabled={(detail[f] ?? 0) <= 0} aria-label={`${f} 감소`}>
                                    <Minus size={14} />
                                </button>
                                <span>{detail[f] ?? 0}</span>
                                <button type="button" onClick={() => change(f, 1)} disabled={total >= item.count} aria-label={`${f} 증가`}>
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                    <p className={`cart-mix__sum${err ? ' is-error' : ' is-ok'}`}>
                        {err ?? `합계 ${total}/${item.count}개 · 맛 구성이 완료됐어요`}
                    </p>
                    <p className="cart-mix__hint">맛은 {MIX_UNIT}개 단위로 고를 수 있어요.</p>
                </div>
            ) : (
                <p className="cart-mix__hint">
                    {FLAVORS.map((f) => `${f} ${evenMix(item.count)[f]}`).join(' · ')}
                </p>
            )}
        </div>
    );
}

function LineRow({ line }: { line: CartLine }) {
    const { setQty, setCycle, removeLine } = useCart();
    const item = getItem(line.sku);
    if (!item) return null;
    const key = lineKey(line);
    const unit = unitPriceOf(line);
    const isSub = line.mode === 'subscribe';

    return (
        <li className="cart-line">
            <img className="cart-line__img" src={getAssetUrl(item.img)} alt="" loading="lazy" />
            <div className="cart-line__body">
                <div className="cart-line__top">
                    <strong>{item.name}</strong>
                    <button type="button" className="cart-line__remove" onClick={() => removeLine(key)} aria-label={`${item.name} 삭제`}>
                        <Trash2 size={16} />
                    </button>
                </div>

                {item.kind === 'bundle' ? <span className="cart-line__meta">무료 배송</span> : null}

                <MixEditor line={line} />

                {isSub ? (
                    <label className="cart-line__cycle">
                        배송 주기
                        <select value={line.cycleDays} onChange={(e) => setCycle(key, Number(e.target.value))}>
                            {CYCLE_OPTIONS.map((d) => (
                                <option key={d} value={d}>
                                    {d}일마다
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}

                <div className="cart-line__bottom">
                    <div className="cart-qty">
                        <button type="button" onClick={() => setQty(key, line.qty - 1)} disabled={line.qty <= 1} aria-label="수량 감소">
                            <Minus size={14} />
                        </button>
                        <span>{line.qty}</span>
                        <button type="button" onClick={() => setQty(key, line.qty + 1)} disabled={line.qty >= maxQty(line.mode)} aria-label="수량 증가">
                            <Plus size={14} />
                        </button>
                    </div>
                    <div className="cart-line__price">
                        <strong>{won(unit * line.qty)}</strong>
                        {!isSub && item.listPrice > item.price ? <s>{won(item.listPrice * line.qty)}</s> : null}
                        {isSub ? <em>{Math.round(SUBSCRIPTION_DISCOUNT_RATE * 100)}% 정기 할인</em> : null}
                    </div>
                </div>
            </div>
        </li>
    );
}

function Section({
    title,
    desc,
    lines,
    mode,
    totalLabel,
    cta,
}: {
    title: string;
    desc: string;
    lines: CartLine[];
    mode: CartLine['mode'];
    totalLabel: string;
    cta: string;
}) {
    const { clearMode, flush } = useCart();
    const router = useRouter();
    const { status } = useSession();
    const [going, setGoing] = React.useState(false);
    if (lines.length === 0) return null;

    const goCheckout = async () => {
        if (going) return;
        const target = `/checkout?type=${mode}`;
        if (status !== 'authenticated') {
            router.push(`/login?callbackUrl=${encodeURIComponent(target)}`);
            return;
        }
        setGoing(true);
        await flush();
        router.push(target);
    };
    const priced = priceCart(lines, mode);
    const listTotal = lines.reduce((sum, l) => sum + (getItem(l.sku)?.listPrice ?? 0) * l.qty, 0);
    const blocked = priced.error !== null;

    return (
        <section className="cart-section">
            <div className="cart-section__head">
                <div>
                    <h2>{title}</h2>
                    <p>{desc}</p>
                </div>
                <button type="button" className="cart-link-btn" onClick={() => clearMode(mode)}>
                    전체 삭제
                </button>
            </div>
            <ul className="cart-lines">
                {lines.map((l) => (
                    <LineRow key={lineKey(l)} line={l} />
                ))}
            </ul>
            <div className="cart-summary">
                <div className="cart-summary__row cart-summary__row--plain">
                    <span>상품 금액</span>
                    <span>{won(priced.subtotal)}</span>
                </div>
                <div className="cart-summary__row cart-summary__row--plain">
                    <span>배송비</span>
                    <span>{priced.shipping === 0 ? '무료' : won(priced.shipping)}</span>
                </div>
                {mode === 'once' && listTotal > priced.subtotal ? (
                    <div className="cart-summary__row cart-summary__row--sub">
                        <span>할인 혜택</span>
                        <span>-{won(listTotal - priced.subtotal)}</span>
                    </div>
                ) : null}
                <div className="cart-summary__row">
                    <span>{totalLabel}</span>
                    <strong>{won(priced.total)}</strong>
                </div>
                {blocked ? <p className="cart-summary__error">{priced.error}</p> : null}
                {blocked ? (
                    <button type="button" className="my-btn my-btn--primary cart-summary__cta" disabled>
                        {cta}
                    </button>
                ) : (
                    <button type="button" className="my-btn my-btn--primary cart-summary__cta" onClick={goCheckout} disabled={going}>
                        {going ? '이동 중...' : cta}
                    </button>
                )}
            </div>
        </section>
    );
}

export function CartView() {
    const { lines, hydrated } = useCart();
    const once = lines.filter((l) => l.mode === 'once');
    const subs = lines.filter((l) => l.mode === 'subscribe');

    return (
        <main className="cart-page">
            <header className="cart-page__head">
                <Link href="/" className="cart-back">
                    <ArrowLeft size={18} />
                    <span>쇼핑 계속하기</span>
                </Link>
                <h1>장바구니</h1>
            </header>

            {!hydrated ? null : lines.length === 0 ? (
                <div className="cart-empty">
                    <ShoppingCart size={40} />
                    <p>장바구니가 비어 있어요</p>
                    <Link href="/#product-lineup" className="my-btn my-btn--primary">
                        제품 둘러보기
                    </Link>
                </div>
            ) : (
                <>
                    <Section
                        title="일반 구매"
                        desc="한 번만 결제하는 상품이에요."
                        lines={once}
                        mode="once"
                        totalLabel="결제 예정 금액"
                        cta="일반 구매 결제하기"
                    />
                    <Section
                        title="정기구독"
                        desc="선택한 주기의 결제일마다 자동 결제·발송돼요. 첫 회 쉐이커 보틀 증정! 단, 최소 2회 이용(결제) 후 해지할 수 있어요."
                        lines={subs}
                        mode="subscribe"
                        totalLabel="회당 결제 금액"
                        cta="정기구독 시작하기"
                    />
                    <p className="cart-note">일반 구매와 정기구독은 결제 방식이 달라 각각 따로 결제돼요.</p>
                </>
            )}
        </main>
    );
}
