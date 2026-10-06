// Per-flavour product-page data (pure data, safe for server and client).
// Prices come from lib/catalog.ts via the SKU; this file only holds page copy and asset names.
import type { Flavor } from './catalog';

export interface ProductPageData {
    slug: string;
    flavor: Flavor;
    sku: string;
    tagline: string;
    description: string;
    ingredient: string;
    calories: string;
    accent: string;
    /** Detail slices 01..13 (02 and 03 are shown as looping videos, see ProductPage). */
    img: string;
}

export const PRODUCT_PAGES: ProductPageData[] = [
    {
        slug: 'grain',
        flavor: '그레인',
        sku: 'single:그레인',
        tagline: '고소한 오곡라떼 맛 · 식사대용 1위',
        description: '각종 통곡물이 듬뿍 들어가 고소한 오곡라떼의 풍미! 귀리 16% + 곡물 9종 황금 블렌딩.',
        ingredient: '귀리 16% + 곡물 9종 황금 블렌딩',
        calories: '203 kcal',
        accent: '#C9963C',
        img: '/assets/product-grain.png',
    },
    {
        slug: 'goguma',
        flavor: '고구마',
        sku: 'single:고구마',
        tagline: '카페 고구마라떼 맛 · 아이 선호 1위',
        description: '카페에서 판매하는 진한 고구마라떼 맛을 그대로! 국산 고구마 15%의 자연스러운 달콤함.',
        ingredient: '국산 달콤한 고구마 15%',
        calories: '186 kcal',
        accent: '#D97706',
        img: '/assets/product-goguma.png',
    },
    {
        slug: 'protein',
        flavor: '단백질',
        sku: 'single:단백질',
        tagline: '단백질 17g · 달걀 3개분',
        description: '단백질 17g(달걀 3개분) 함유! 비린맛 없이 간편하고 맛있게 단백질을 보충하는 고단백 오트밀.',
        ingredient: 'WPC 식물성/동물성 황금 비율',
        calories: '213 kcal',
        accent: '#7A2331',
        img: '/assets/product-protein.png',
    },
    {
        slug: 'seoritae',
        flavor: '서리태',
        sku: 'single:서리태',
        tagline: '검은콩 두유 맛 · 국산 서리태',
        description: '우유에 타 먹으면 달콤하고 고소한 검은콩 두유 맛! 국산 검은콩 서리태 12%.',
        ingredient: '국산 검은콩 서리태 12%',
        calories: '198 kcal',
        accent: '#3F3F46',
        img: '/assets/product-seoritae.png',
    },
    {
        slug: 'choco',
        flavor: '초코',
        sku: 'single:초코',
        tagline: '진짜 초코라떼 맛 · 단백질 13g',
        description: '인공 초코 향이 아닌 진짜 초코 맛에 단백질 13g! 네덜란드산 프리미엄 코코아 6.9%.',
        ingredient: '네덜란드산 프리미엄 코코아 6.9%',
        calories: '199 kcal',
        accent: '#78350F',
        img: '/assets/product-choco.png',
    },
];

export const getProductPage = (slug: string) => PRODUCT_PAGES.find((p) => p.slug === slug);
export const slugForFlavor = (flavor: string) => PRODUCT_PAGES.find((p) => p.flavor === flavor)?.slug;

/** Detail images live in /public/detail/<slug>/; set NEXT_PUBLIC_DETAIL_URL to serve them from R2/CDN instead. */
export const detailUrl = (slug: string, file: string) =>
    `${process.env.NEXT_PUBLIC_DETAIL_URL || '/detail'}/${slug}/${file}`;
