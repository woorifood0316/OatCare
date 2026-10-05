// Single source of truth for sellable items and cart-line pricing.
// Pure data + functions (no React / no browser APIs) so the server can reuse it to
// re-price orders at checkout. Display copy in Sections.tsx must stay in sync with this.

export const FLAVORS = ['그레인', '고구마', '단백질', '서리태', '초코'] as const;

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
}

const SINGLE_IMG: Record<(typeof FLAVORS)[number], string> = {
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
    },
];

// Subscription pricing (adjustable later).
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

export function lineKey(line: CartLine): string {
    return [line.sku, line.mode, line.cycleDays ?? '', line.mix ?? ''].join('|');
}

export function maxQty(mode: PurchaseMode): number {
    return mode === 'subscribe' ? MAX_QTY_SUBSCRIBE : MAX_QTY_ONCE;
}
