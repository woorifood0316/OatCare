// What the package label says (제품 상세정보 / 영양정보 in each flavour's last detail image, /public/detail/<slug>/13.webp).
// The label is the source of truth: answers about nutrition, allergens, storage etc. come from here, word for word.
// One pouch = 50 g; % = share of the daily reference value (2,000 kcal basis).
import type { Flavor } from './catalog';

export interface Nutrient {
    amount: string;
    pct?: number;
}

export interface ProductFacts {
    flavor: Flavor;
    kcal: number;
    sodium: Nutrient;
    carbs: Nutrient;
    sugars: Nutrient;
    fiber: Nutrient;
    fat: Nutrient;
    transFat: Nutrient;
    saturatedFat: Nutrient;
    cholesterol: Nutrient;
    protein: Nutrient;
    /** "같은 제조시설" / "혼입가능" notice, as printed. */
    crossContact: string;
    /** 원재료명, as printed. */
    ingredients: string;
}

export const LABEL_COMMON = {
    weight: '50g',
    foodType: '즉석섭취식품',
    shelfLife: '별도 표기일까지 (포장에 적힌 날짜)',
    allergens: '우유, 대두, 밀 함유',
    storage: '직사광선을 피하여 건조하고 서늘한 곳에 밀봉 보관하세요. 개봉 후에는 바로 섭취하시기 바랍니다.',
    packaging: '폴리에틸렌 (내포장재질)',
    manufacturer: '농업회사법인㈜두리두리 (충남 논산시 성동면 산업단지로 4길 33)',
    seller: '우리종합식품 (경기도 김포시 양촌읍 황금1로 2-71)',
};

const SAME_FACILITY = '계란, 메밀, 땅콩, 토마토, 호두, 오징어를 사용한 제품과 같은 제조시설에서 제조하고 있습니다.';
const MAY_CONTAIN = '알류, 메밀, 땅콩, 게, 새우, 돼지고기, 복숭아, 토마토, 호두, 닭고기, 쇠고기, 오징어, 조개류(굴, 전복, 홍합 포함), 잣 혼입 가능';

export const PRODUCT_FACTS: Record<Flavor, ProductFacts> = {
    그레인: {
        flavor: '그레인',
        ingredients: '가공전지분[물엿, 유청분말(외국산), 가공유지(야자경화유, 외국산), 유크림, 유당], 압착귀리(귀리:캐나다산), 혼합곡물플러스[현미(국산), 보리(국산), 찰현미, 밀, 맵쌀, 볶음아몬드분말, 분리대두단백, 난소화성말토덱스트린, 설탕, 현미볶음, 볶음콩가루, 수크랄로스(감미료)',
        kcal: 203,
        sodium: { amount: '120mg', pct: 6 },
        carbs: { amount: '30g', pct: 9 },
        sugars: { amount: '7g', pct: 7 },
        fiber: { amount: '8g', pct: 32 },
        fat: { amount: '7g', pct: 13 },
        transFat: { amount: '0g' },
        saturatedFat: { amount: '2.6g', pct: 17 },
        cholesterol: { amount: '5mg 미만', pct: 1 },
        protein: { amount: '9g', pct: 16 },
        crossContact: SAME_FACILITY,
    },
    고구마: {
        flavor: '고구마',
        ingredients: '가공전지분[물엿, 유청분말(외국산), 가공유지(야자경화유, 외국산), 유크림, 유당], 눌린귀리(캐나다산), 분리대두단백(중국산), 난소화성말토덱스트린, 설탕, 고구마분말[고구마분말(고구마:국산), 덱스트린], 혼합곡물플러스, 치커리추출물, 현미볶음, 향료, 볶음아몬드분말, 혼합제제[덱스트린, 혼합제제(글리세린, 향료, 주정, 프로필렌글리콜), 아라비아검], 수크랄로스(감미료)',
        kcal: 186,
        sodium: { amount: '170mg', pct: 9 },
        carbs: { amount: '32g', pct: 10 },
        sugars: { amount: '8g', pct: 8 },
        fiber: { amount: '10.8g', pct: 43 },
        fat: { amount: '4.4g', pct: 8 },
        transFat: { amount: '0g' },
        saturatedFat: { amount: '3g', pct: 20 },
        cholesterol: { amount: '5mg 미만', pct: 1 },
        protein: { amount: '10g', pct: 18 },
        crossContact: MAY_CONTAIN,
    },
    단백질: {
        flavor: '단백질',
        ingredients: '분리대두단백(중국산), 압착귀리(귀리:캐나다산), 가공전지분[물엿, 유청분말(외국산), 가공유지{야자경화유(야자유:외국산)}, 유크림, 유당], 혼합곡물플러스(현미, 보리, 찰현미, 밀, 멥쌀), 볶음아몬드분말, 설탕, 현미볶음, 볶음콩가루, 농축유청단백분말, 수크랄로스(감미료), 혼합제제(L-이소로이신, L-발린, L-로이신)',
        kcal: 213,
        sodium: { amount: '275mg', pct: 14 },
        carbs: { amount: '22g', pct: 7 },
        sugars: { amount: '6g', pct: 6 },
        fiber: { amount: '3g', pct: 12 },
        fat: { amount: '7g', pct: 13 },
        transFat: { amount: '0g' },
        saturatedFat: { amount: '2.5g', pct: 22 },
        cholesterol: { amount: '10mg', pct: 3 },
        protein: { amount: '17g', pct: 31 },
        crossContact: SAME_FACILITY,
    },
    서리태: {
        flavor: '서리태',
        ingredients: '가공전지분[물엿, 유청분말(외국산), 가공유지{야자경화유(야자유:외국산)}, 유크림, 유당], 압착귀리(귀리:캐나다산), 분리대두단백(중국산), 서리태가루(국산), 난소화성말토덱스트린, 설탕, 혼합곡물플러스(현미, 보리, 찰현미, 밀, 멥쌀), 볶음아몬드분말, 흑미볶음, 수크랄로스(감미료)',
        kcal: 198,
        sodium: { amount: '166mg', pct: 8 },
        carbs: { amount: '29g', pct: 9 },
        sugars: { amount: '7g', pct: 7 },
        fiber: { amount: '8g', pct: 32 },
        fat: { amount: '6g', pct: 11 },
        transFat: { amount: '0g' },
        saturatedFat: { amount: '2.6g', pct: 17 },
        cholesterol: { amount: '5mg 미만', pct: 1 },
        protein: { amount: '11g', pct: 20 },
        crossContact: SAME_FACILITY,
    },
    초코: {
        flavor: '초코',
        ingredients: '분리대두단백(중국산), 가공전지분[물엿, 유청분말(외국산), 가공유지{야자경화유(야자유:외국산)}, 유크림, 유당], 눌린귀리(캐나다산), 설탕, 코코아분말(네덜란드산), 치커리추출물, 초코맛분말, 오트크런치볼, 혼합제제[덱스트린, 혼합제제(글리세린, 향료, 주정, 프로필렌글리콜), 아라비아검], 향료1, 향료2, 수크랄로스(감미료)',
        kcal: 199,
        sodium: { amount: '228mg', pct: 11 },
        carbs: { amount: '28g', pct: 9 },
        sugars: { amount: '8g', pct: 8 },
        fiber: { amount: '2.6g', pct: 10 },
        fat: { amount: '4.5g', pct: 8 },
        transFat: { amount: '0g' },
        saturatedFat: { amount: '3.3g', pct: 22 },
        cholesterol: { amount: '5mg 미만', pct: 1 },
        protein: { amount: '13g', pct: 24 },
        crossContact: MAY_CONTAIN,
    },
};

/** The printed notice, said in the answers' tone. */
const crossSay = (c: string) =>
    c === SAME_FACILITY
        ? '계란, 메밀, 땅콩, 토마토, 호두, 오징어를 사용한 제품과 같은 제조시설에서 만들어요.'
        : '제조 과정에서 알류, 메밀, 땅콩, 게, 새우, 돼지고기, 복숭아, 토마토, 호두, 닭고기, 쇠고기, 오징어, 조개류(굴, 전복, 홍합 포함), 잣이 섞여 들어갈 수 있어요(혼입 가능).';

const n = (x: Nutrient) => (x.pct !== undefined ? `${x.amount}(1일 기준치의 ${x.pct}%)` : x.amount);

/**
 * Answers built from the label, one set per flavour (sku single:<flavor>) and one combined set for the set pages
 * (sku null). `key` identifies a generated FAQ so a later sync updates it instead of adding a copy.
 */
export function factFaqs(): { key: string; sku: string | null; question: string; keywords: string; answer: string }[] {
    const out: { key: string; sku: string | null; question: string; keywords: string; answer: string }[] = [];
    const flavors = Object.keys(PRODUCT_FACTS) as Flavor[];
    for (const fl of flavors) {
        const f = PRODUCT_FACTS[fl];
        const sku = `single:${fl}`;
        const one = `${fl} 한 포(${LABEL_COMMON.weight})`;
        const add = (topic: string, question: string, keywords: string, answer: string) =>
            out.push({ key: `fact:${fl}:${topic}`, sku, question, keywords, answer });
        add('sugar', '당류(당)는 얼마나 들어 있나요?', '당 당은 당이 당도 당분 당함량 당류 설탕 달아요 단맛 달달', `${one}의 당류는 ${n(f.sugars)}예요.`);
        add('kcal', '칼로리(열량)가 얼마예요?', '칼로리 칼로리는 kcal 열량 살찌', `${one}의 열량은 ${f.kcal}kcal예요.`);
        add('protein', '단백질은 얼마나 들어 있나요?', '단백질 단백질이 단백질은 프로틴 그램', `${one}의 단백질은 ${n(f.protein)}이에요.`);
        add('sodium', '나트륨(염분)은 얼마나 되나요?', '나트륨 염분 짠 소금', `${one}의 나트륨은 ${n(f.sodium)}이에요.`);
        add('fiber', '식이섬유는 얼마나 들어 있나요?', '식이섬유 섬유질 화장실', `${one}의 식이섬유는 ${n(f.fiber)}예요.`);
        add('fat', '지방이나 콜레스테롤은 얼마나 되나요?', '지방 포화지방 트랜스지방 콜레스테롤', `${one}의 지방은 ${n(f.fat)}(포화지방 ${n(f.saturatedFat)}, 트랜스지방 ${f.transFat.amount}), 콜레스테롤은 ${n(f.cholesterol)}이에요.`);
        add('carbs', '탄수화물은 얼마나 되나요?', '탄수화물 탄수 당질', `${one}의 탄수화물은 ${n(f.carbs)}이에요.`);
        add(
            'nutrition',
            '영양성분(영양정보) 전체가 궁금해요',
            '영양성분 영양정보 성분표 영양',
            `${one} 기준: 열량 ${f.kcal}kcal, 나트륨 ${n(f.sodium)}, 탄수화물 ${n(f.carbs)}, 당류 ${n(f.sugars)}, 식이섬유 ${n(f.fiber)}, 지방 ${n(f.fat)}, 트랜스지방 ${f.transFat.amount}, 포화지방 ${n(f.saturatedFat)}, 콜레스테롤 ${n(f.cholesterol)}, 단백질 ${n(f.protein)}. (1일 영양성분 기준치 2,000kcal 기준)`,
        );
        add('ingredients', '원재료가 뭐예요? 국산이에요?', '원재료 원재료명 성분 원산지 국산 수입 들어간 재료 첨가물', `${fl} 원재료명: ${f.ingredients}. (${LABEL_COMMON.allergens})`);
        add(
            'allergy',
            '알레르기 성분이 있나요? 우유나 대두 들어가요?',
            '알레르기 알러지 우유 대두 밀 땅콩 계란 견과',
            `${fl}에는 ${LABEL_COMMON.allergens}되어 있어요. 또한 ${crossSay(f.crossContact)} 알레르기가 있으시면 드시기 전에 꼭 확인해 주세요.`,
        );
    }
    // Set pages: every flavour at once.
    const each = (pick: (f: ProductFacts) => string) => flavors.map((fl) => `${fl} ${pick(PRODUCT_FACTS[fl])}`).join(', ');
    const all = (topic: string, question: string, keywords: string, answer: string) => out.push({ key: `fact:all:${topic}`, sku: null, question, keywords, answer });
    all('sugar', '당류(당)는 얼마나 들어 있나요?', '당 당은 당이 당도 당분 당함량 당류 설탕 달아요 단맛 달달', `한 포(${LABEL_COMMON.weight}) 기준 당류는 ${each((f) => f.sugars.amount)}이에요.`);
    all('kcal', '칼로리(열량)가 얼마예요?', '칼로리 kcal 열량', `한 포(${LABEL_COMMON.weight}) 기준 ${each((f) => `${f.kcal}kcal`)}예요.`);
    all('protein', '단백질은 얼마나 들어 있나요?', '단백질 프로틴', `한 포(${LABEL_COMMON.weight}) 기준 단백질은 ${each((f) => f.protein.amount)}이에요.`);
    all('sodium', '나트륨(염분)은 얼마나 되나요?', '나트륨 염분 짠', `한 포(${LABEL_COMMON.weight}) 기준 나트륨은 ${each((f) => f.sodium.amount)}이에요.`);
    all('fiber', '식이섬유는 얼마나 들어 있나요?', '식이섬유 섬유질', `한 포(${LABEL_COMMON.weight}) 기준 식이섬유는 ${each((f) => f.fiber.amount)}예요.`);
    all('allergy', '알레르기 성분이 있나요? 우유나 대두 들어가요?', '알레르기 알러지 우유 대두 밀 땅콩 계란', `5가지 맛 모두 ${LABEL_COMMON.allergens}되어 있어요. 같은 제조시설에서 다루는 다른 원료(계란, 메밀, 땅콩, 토마토, 호두, 오징어 등)는 맛마다 조금씩 달라서, 맛별 상세페이지의 제품 상세정보를 확인해 주세요.`);
    all('storage', '보관은 어떻게 하나요? 냉장 보관해야 하나요?', '보관 냉장 실온 습기 개봉', `${LABEL_COMMON.storage.replace('보관하세요.', '보관해 주세요.').replace('섭취하시기 바랍니다.', '드시는 게 좋아요.')}`);
    all('shelf', '소비기한(유통기한)이 언제까지예요?', '소비기한 유통기한 기한 날짜 언제까지', '소비기한은 포장에 따로 표기된 날짜까지예요. 받으신 상품의 포장에서 확인해 주세요.');
    // From the detail page's own "자주 물어보시는 질문" (12.webp)
    all('microwave', '전자레인지에 데워 먹어도 되나요?', '전자레인지 데워 데우기 렌지 따뜻하게 뜨겁게', '네, 따뜻한 물이나 우유를 부어 부드럽게 드실 수 있어요. 기호에 따라 전자레인지에 짧게 데워 드시면 더 포근한 식감으로 즐기실 수 있어요.');
    all('yogurt', '요거트나 과일이랑 같이 먹어도 되나요?', '요거트 요구르트 과일 견과류 꿀 토핑 같이', '네, 우유·두유·요거트 또는 물을 부어 간편하게 드실 수 있어요. 취향에 따라 과일, 견과류, 꿀 등을 더하면 더욱 맛있게 즐기실 수 있어요.');
    all('maker', '어디서 만드나요? 제조사가 어디예요?', '제조원 제조사 공장 국산 어디서 만들', `제조원은 ${LABEL_COMMON.manufacturer}이고, 판매원은 ${LABEL_COMMON.seller}이에요.`);
    return out;
}
