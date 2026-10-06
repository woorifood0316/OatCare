// Single source of truth for sellable items and cart-line pricing.
// Pure data + functions (no React / no browser APIs) so the server can reuse it to
// re-price orders at checkout. Display copy in Sections.tsx must stay in sync with this.

export const FLAVORS = ['그레인', '고구마', '단백질', '서리태', '초코'] as const;
export type Flavor = (typeof FLAVORS)[number];

export type CatalogKind = 'single' | 'bundle';

export interface CatalogItem {
    sku: string;
    kind: CatalogKind;
    name: string;
    img: string;
    price: number;
    listPrice: number;
    /** Number of sachets in the item (also the default subscription cycle in days). */
    count: number;
    subscribable: boolean;
    /** Bundles of 20/30 let the customer choose the flavor mix (units of 5). */
    mixSelectable: boolean;
}

const SINGLE_IMG: Record<Flavor, string> = {
    그레인: '/assets/product-grain.png',
    고구마: '/assets/product-goguma.png',
    단백질: '/assets/product-protein.png',
    서리태: '/assets/product-seoritae.png',
    초코: '/assets/product-choco.png',
};

export const CATALOG: CatalogItem[] = [
    ...FLAVORS.map(
        (flavor): CatalogItem => ({
            sku: `single:${flavor}`,
            kind: 'single',
            name: `참오트케어 ${flavor}`,
            img: SINGLE_IMG[flavor],
            price: 1100,
            listPrice: 1250,
            count: 1,
            subscribable: false,
            mixSelectable: false,
        }),
    ),
    {
        sku: 'bundle:10',
        kind: 'bundle',
        name: '5종 맛보기 10개입 세트',
        img: '/assets/bundle-all-1.jpg',
        price: 12000,
        listPrice: 12500,
        count: 10,
        subscribable: false,
        mixSelectable: false,
    },
    {
        sku: 'bundle:20',
        kind: 'bundle',
        name: '든든 20개입 한달 박스',
        img: '/assets/bundle-all-2.jpg',
        price: 19800,
        listPrice: 25000,
        count: 20,
        subscribable: true,
        mixSelectable: true,
    },
    {
        sku: 'bundle:30',
        kind: 'bundle',
        name: '대용량 30개입 패밀리 박스',
        img: '/assets/bundle-all-3.jpg',
        price: 27000,
        listPrice: 37500,
        count: 30,
        subscribable: true,
        mixSelectable: true,
    },
];

// ---- Policy constants (placeholders — confirm with the business before launch) ----
export const SUBSCRIPTION_DISCOUNT_RATE = 0.05;
export const CYCLE_MIN = 10;
export const CYCLE_MAX = 60;
export const CYCLE_STEP = 5;
export const CYCLE_OPTIONS: number[] = Array.from(
    { length: (CYCLE_MAX - CYCLE_MIN) / CYCLE_STEP + 1 },
    (_, i) => CYCLE_MIN + i * CYCLE_STEP,
);
export const MAX_QTY_ONCE = 99;
export const MAX_QTY_SUBSCRIBE = 10;
export const MIX_UNIT = 5;
/** Shipping: free when the order has a bundle (site copy) or reaches the threshold. */
export const SHIPPING_FEE = 3000;
export const FREE_SHIPPING_MIN = 30000;

/** Subscriptions must be paid at least this many times (cancelling earlier only schedules the end). */
export const MIN_SUBSCRIPTION_CHARGES = 2;
/** Welcome coupon issued at sign-up. */
export const WELCOME_COUPON_NAME = '신규 가입 쿠폰';
export const WELCOME_COUPON_AMOUNT = 5000;
export const WELCOME_COUPON_DAYS = 60;
export const WELCOME_COUPON_MIN_ORDER = 10000;
/** Toss rejects payments below this. */
export const MIN_PAYABLE = 100;
export const GIFT_SHAKER_NAME = '참오트케어 쉐이커 보틀 (정기구독 첫 회 증정)';

export type PurchaseMode = 'once' | 'subscribe';
export type MixOption = 'all' | 'custom';

export interface CartLine {
    sku: string;
    qty: number;
    mode: PurchaseMode;
    /** Only for mode === 'subscribe'. */
    cycleDays?: number;
    /** Only for bundles. */
    mix?: MixOption;
    /** Only when mix === 'custom': flavor -> sachets. */
    mixDetail?: Record<string, number>;
}

export function getItem(sku: string): CatalogItem | undefined {
    return CATALOG.find((i) => i.sku === sku);
}

export function findSkuByName(name: string): string | undefined {
    const single = CATALOG.find((i) => i.kind === 'single' && i.sku === `single:${name}`);
    if (single) return single.sku;
    return CATALOG.find((i) => i.name === name)?.sku;
}

export function subscriptionUnitPrice(item: CatalogItem): number {
    return Math.round((item.price * (1 - SUBSCRIPTION_DISCOUNT_RATE)) / 10) * 10;
}

export function unitPriceOf(line: CartLine): number {
    const item = getItem(line.sku);
    if (!item) return 0;
    return line.mode === 'subscribe' ? subscriptionUnitPrice(item) : item.price;
}

export function maxQty(mode: PurchaseMode): number {
    return mode === 'subscribe' ? MAX_QTY_SUBSCRIBE : MAX_QTY_ONCE;
}

function mixDetailKey(detail?: Record<string, number>): string {
    if (!detail) return '';
    return FLAVORS.map((f) => `${f}:${detail[f] ?? 0}`).join(',');
}

export function lineKey(line: CartLine): string {
    return [line.sku, line.mode, line.cycleDays ?? '', line.mix ?? '', mixDetailKey(line.mixDetail)].join('|');
}

// ---- Flavor mix ----

/** Even split used for the "골고루" option (e.g. 20 -> 4 each). */
export function evenMix(count: number): Record<string, number> {
    const each = count / FLAVORS.length;
    return Object.fromEntries(FLAVORS.map((f) => [f, each]));
}

/** Returns an error message when the line's flavor mix is not orderable, else null. */
export function mixError(line: CartLine): string | null {
    const item = getItem(line.sku);
    if (!item || item.kind !== 'bundle') return null;
    if (!item.mixSelectable || line.mix !== 'custom') return null;
    const detail = line.mixDetail;
    if (!detail) return '맛 구성을 선택해 주세요';
    let total = 0;
    for (const flavor of FLAVORS) {
        const n = detail[flavor] ?? 0;
        if (!Number.isInteger(n) || n < 0 || n % MIX_UNIT !== 0) return '맛은 5개 단위로 선택해 주세요';
        total += n;
    }
    if (total !== item.count) return `맛 구성을 ${item.count}개로 맞춰 주세요 (현재 ${total}개)`;
    return null;
}

/** The flavor breakdown that will actually ship, or null for single items. */
export function resolvedMix(line: CartLine): Record<string, number> | null {
    const item = getItem(line.sku);
    if (!item || item.kind !== 'bundle') return null;
    if (item.mixSelectable && line.mix === 'custom' && line.mixDetail && !mixError(line)) {
        return Object.fromEntries(FLAVORS.map((f) => [f, line.mixDetail![f] ?? 0]));
    }
    return evenMix(item.count);
}

// ---- Sanitizing (used by the browser store and by the server) ----

export function sanitizeLines(raw: unknown): CartLine[] {
    if (!Array.isArray(raw)) return [];
    const out: CartLine[] = [];
    for (const r of raw.slice(0, 50)) {
        if (!r || typeof r !== 'object') continue;
        const { sku, qty, mode, cycleDays, mix, mixDetail } = r as Record<string, unknown>;
        if (typeof sku !== 'string') continue;
        const item = getItem(sku);
        if (!item) continue;
        if (mode !== 'once' && mode !== 'subscribe') continue;
        if (mode === 'subscribe' && !item.subscribable) continue;
        const q = Math.max(1, Math.min(maxQty(mode), Math.floor(Number(qty)) || 1));
        const line: CartLine = { sku, qty: q, mode };
        if (mode === 'subscribe') {
            line.cycleDays = CYCLE_OPTIONS.includes(Number(cycleDays)) ? Number(cycleDays) : item.count;
        }
        if (item.kind === 'bundle') {
            line.mix = item.mixSelectable && mix === 'custom' ? 'custom' : 'all';
            if (line.mix === 'custom' && mixDetail && typeof mixDetail === 'object') {
                const detail: Record<string, number> = {};
                for (const f of FLAVORS) {
                    const n = Number((mixDetail as Record<string, unknown>)[f] ?? 0);
                    detail[f] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
                }
                line.mixDetail = detail;
            }
        }
        out.push(line);
    }
    return out;
}

/** Merge two carts. Matching lines keep the larger quantity (so a re-synced cart never doubles). */
export function mergeCarts(a: CartLine[], b: CartLine[]): CartLine[] {
    const map = new Map<string, CartLine>();
    for (const l of [...a, ...b]) {
        const k = lineKey(l);
        const prev = map.get(k);
        map.set(k, prev ? { ...prev, qty: Math.min(Math.max(prev.qty, l.qty), maxQty(l.mode)) } : l);
    }
    return [...map.values()];
}

// ---- Pricing (server re-prices with this; the client uses it for display) ----

export interface PricedItem {
    sku: string;
    name: string;
    qty: number;
    unitPrice: number;
    amount: number;
    mode: PurchaseMode;
    cycleDays?: number;
    mix?: MixOption;
    mixBreakdown?: Record<string, number>;
    count: number;
    /** Free gift line (0원). */
    gift?: boolean;
}

export interface PricedCart {
    items: PricedItem[];
    subtotal: number;
    shipping: number;
    total: number;
    /** First problem that blocks checkout (e.g. incomplete flavor mix), if any. */
    error: string | null;
}

export function priceCart(lines: CartLine[], mode: PurchaseMode): PricedCart {
    const selected = lines.filter((l) => l.mode === mode);
    const items: PricedItem[] = [];
    let error: string | null = null;
    let hasBundle = false;

    for (const l of selected) {
        const item = getItem(l.sku);
        if (!item) continue;
        if (item.kind === 'bundle') hasBundle = true;
        const err = mixError(l);
        if (err && !error) error = `${item.name}: ${err}`;
        const unit = unitPriceOf(l);
        items.push({
            sku: l.sku,
            name: item.name,
            qty: l.qty,
            unitPrice: unit,
            amount: unit * l.qty,
            mode: l.mode,
            cycleDays: l.cycleDays,
            mix: l.mix,
            mixBreakdown: resolvedMix(l) ?? undefined,
            count: item.count,
        });
    }

    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const free = hasBundle || subtotal >= FREE_SHIPPING_MIN || subtotal === 0;
    const shipping = free ? 0 : SHIPPING_FEE;
    if (items.length === 0) error = '담긴 상품이 없어요';
    return { items, subtotal, shipping, total: subtotal + shipping, error };
}

export function orderNameOf(items: PricedItem[]): string {
    if (items.length === 0) return '참오트케어';
    const first = items[0].name;
    return items.length === 1 ? first : `${first} 외 ${items.length - 1}건`;
}

/** The free first-order gift for new subscribers. */
export function giftItem(): PricedItem {
    return { sku: 'gift:shaker', name: GIFT_SHAKER_NAME, qty: 1, unitPrice: 0, amount: 0, mode: 'subscribe', count: 1, gift: true };
}

/**
 * Coupon discount for an order. `subtotal` is checked against the coupon's minimum order,
 * and the customer always pays at least MIN_PAYABLE.
 */
export function couponDiscount(coupon: { amount: number; minOrder: number }, subtotal: number, total: number): number {
    if (subtotal < coupon.minOrder) return 0;
    return Math.max(0, Math.min(coupon.amount, total - MIN_PAYABLE));
}
