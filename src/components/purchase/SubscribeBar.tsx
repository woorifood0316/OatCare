'use client';

import React, { useEffect, useState } from 'react';
import { preloadCoupons } from './CouponHint';
import { Repeat, ShoppingBag } from 'lucide-react';
import { SUBSCRIPTION_DISCOUNT_RATE, getItem, type CartLine } from '../../lib/catalog';
import { SetBuyBody, SheetFrame, type BuyMode } from './BuySheet';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/**
 * Phone bottom bar on set pages. 20·30 sets: [일반 구매] [정기구독 5%↓]; the 10-pack: [구매하기]. Each opens the shared
 * purchase sheet (BuySheet) already on the chosen way of buying. The sheet shares quantity and flavour mix with the
 * page's own picker, which is shown on wide screens only.
 */
export function SubscribeBar({
    sku,
    qty,
    setQty,
    mixChoice,
    mixErr,
    mixPicker,
}: {
    sku: string;
    qty: number;
    setQty: (n: number) => void;
    mixChoice: Pick<CartLine, 'mix' | 'mixDetail'>;
    mixErr: string | null;
    /** The flavour mix picker (useMixChoice), rendered inside the sheet. */
    mixPicker: React.ReactNode;
}) {
    const item = getItem(sku);
    const [open, setOpen] = useState<BuyMode | null>(null);
    useEffect(() => preloadCoupons(), []);
    if (!item) return null;
    const pct = Math.round(SUBSCRIPTION_DISCOUNT_RATE * 100);

    return (
        <>
            {item.subscribable ? (
                <div className="sbar" role="group" aria-label="구매 방식">
                    <button type="button" className="sbar__once" onClick={() => setOpen('once')}>
                        일반 구매
                    </button>
                    <button type="button" className="sbar__sub" onClick={() => setOpen('subscribe')}>
                        <span className="sbar__badge">보틀 증정</span>
                        <Repeat size={16} aria-hidden="true" />
                        <span>
                            정기구독 <b>{pct}%↓</b>
                        </span>
                    </button>
                </div>
            ) : (
                <div className="sbar sbar--one" role="group" aria-label="구매">
                    <span className="sbar__sum">
                        <small>세트 가격</small>
                        <b>{won(item.price)}</b>
                    </span>
                    <button type="button" className="sbar__sub" onClick={() => setOpen('once')}>
                        <ShoppingBag size={16} aria-hidden="true" />
                        <span>구매하기</span>
                    </button>
                </div>
            )}

            {open ? (
                <SheetFrame label="구매하기" onClose={() => setOpen(null)}>
                    {(close) => (
                        <SetBuyBody
                            sku={sku}
                            initialMode={open}
                            qty={qty}
                            setQty={setQty}
                            mixChoice={mixChoice}
                            mixErr={mixErr}
                            mixPicker={mixPicker}
                            onClose={close}
                        />
                    )}
                </SheetFrame>
            ) : null}
        </>
    );
}
