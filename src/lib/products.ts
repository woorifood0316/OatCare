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

export interface SetPageData {
    count: 10 | 20 | 30;
    sku: string;
    tagline: string;
    description: string;
    img: string;
    points: string[];
}

export const SET_PAGES: SetPageData[] = [
    {
        count: 10,
        sku: 'bundle:10',
        tagline: '5가지 맛 각 2개입 · 총 10개 구성',
        description: '참오트케어 5가지 맛을 각 2개씩 담은 입문용 세트. 온 가족 취향을 먼저 탐색해 보세요.',
        img: '/assets/bundle-all-1.jpg',
        points: ['그레인·고구마·단백질·서리태·초코 각 2포', '개당 1,200원 (정가 1,250원)', '정기구독은 20·30개입 세트에서 가능해요'],
    },
    {
        count: 20,
        sku: 'bundle:20',
        tagline: '맛별 최소 5개 선택 · 무료 배송',
        description: '원하는 맛을 자유롭게 조합해 한 달 아침을 든든하게. 재구매율 1위 베스트 세트.',
        img: '/assets/bundle-all-2.jpg',
        points: ['5가지 맛 중 원하는 조합 (맛별 5개 단위, 장바구니에서 선택)', '개당 990원 (정가 1,250원)', '정기구독 시 5% 추가 할인 · 첫 회 쉐이커 보틀 증정'],
    },
    {
        count: 30,
        sku: 'bundle:30',
        tagline: '맛별 최소 5개 선택 · 보틀 증정',
        description: '온 가족이 함께 먹는 대용량 패밀리 박스. 개당 최저가로 가장 경제적이에요.',
        img: '/assets/bundle-all-3.jpg',
        points: ['5가지 맛 중 원하는 조합 (맛별 5개 단위, 장바구니에서 선택)', '개당 900원 (정가 1,250원)', '정기구독 시 5% 추가 할인 · 첫 회 쉐이커 보틀 증정'],
    },
];

export const getSetPage = (count: string | number) => SET_PAGES.find((s) => String(s.count) === String(count));
export const slugForSetName = (name: string) => {
    const m = name.match(/(10|20|30)개입/);
    return m ? m[1] : undefined;
};
