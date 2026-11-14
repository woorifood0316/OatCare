// Starter FAQ answers, inserted once when the faqs table is empty. Built only from what the site already states
// (catalog prices and rules, product page copy). Allergy / storage / shelf-life answers point to the label on purpose:
// the exact wording lives on the package and the detail images, not in this code.
import {
    BOX_SIZE,
    COUPON_VALID_DAYS,
    CYCLE_MAX,
    CYCLE_MIN,
    CYCLE_STEP,
    MIN_SUBSCRIPTION_CHARGES,
    MIX_UNIT,
    RETURN_CHANGE_OF_MIND_DAYS,
    RETURN_FEE_ONE_WAY,
    RETURN_FEE_ROUND_TRIP,
    REVIEW_REWARD_PHOTO,
    REVIEW_REWARD_TEXT,
    SHIPPING_FEE,
    SUBSCRIPTION_DISCOUNT_RATE,
    WELCOME_COUPON_AMOUNT,
    getItem,
} from './catalog';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const price = (sku: string) => won(getItem(sku)?.price ?? 0);
const pct = Math.round(SUBSCRIPTION_DISCOUNT_RATE * 100);

export const FAQ_SEED: { question: string; keywords: string; answer: string }[] = [
    // ---- 먹는 방법 ----
    {
        question: '어떻게 먹어요? 먹는 방법이 궁금해요',
        keywords: '타먹는법 섭취방법 조리법 만드는법 몇ml 물양',
        answer: '한 포(50g)를 뜯어 물이나 우유 180ml를 붓고 30초 정도 잘 저어 드시면 돼요. 쉐이커 보틀에 넣고 흔들면 더 잘 섞여요.',
    },
    {
        question: '찬물이나 정수기 물로 타 먹어도 되나요?',
        keywords: '찬물 냉수 정수기 차가운물 뜨거운물 안끓여도 생수',
        answer: '네, 찬물이나 정수기 물로도 잘 섞여요. 끓인 물이 없어도 바로 타 드실 수 있어요.',
    },
    {
        question: '우유에 타 먹어도 되나요? 두유나 아몬드유는요?',
        keywords: '우유 두유 아몬드유 귀리우유 오트밀크 저지방',
        answer: '네, 우유·두유·아몬드유 모두 잘 어울려요. 우유에 타면 더 고소하고 부드러워요. 특히 서리태 맛은 우유에 타면 검은콩 두유 맛이 나요.',
    },
    {
        question: '따뜻하게 먹어도 되나요?',
        keywords: '따뜻한우유 데워서 뜨겁게 온수 겨울',
        answer: '네, 따뜻하게 데운 우유나 물 180ml에 타 드셔도 좋아요. 쌀쌀한 아침에는 따뜻하게 드시는 걸 추천해요.',
    },
    {
        question: '물 양을 조절해도 되나요? 더 진하게 먹고 싶어요',
        keywords: '농도 진하게 묽게 걸쭉 되직 물양조절',
        answer: '네, 기본은 180ml예요. 진하게 드시려면 물을 조금 줄이고, 묽게 드시려면 늘리시면 돼요.',
    },
    {
        question: '미리 타 놓고 나중에 먹어도 되나요? 오버나이트 오트밀처럼요',
        keywords: '오버나이트 냉장 하룻밤 미리 타두기 밤에',
        answer: '밀폐 보틀에 한 포와 우유 180ml를 넣고 냉장고에 하룻밤 두면, 다음 날 부드러운 푸딩 같은 오버나이트 오트밀로 드실 수 있어요. 타 둔 뒤에는 꼭 냉장 보관하고 가능한 빨리 드세요.',
    },
    {
        question: '하루에 몇 개 먹으면 돼요?',
        keywords: '하루 몇포 몇개 섭취량 언제 아침',
        answer: '보통 아침 한 끼로 하루 1포를 드세요. 든든하게 드시고 싶으면 우유에 타 드시거나, 간식으로 한 포 더 드셔도 돼요.',
    },
    {
        question: '맛을 번갈아 먹어도 되나요?',
        keywords: '섞어서 번갈아 다른맛 같이 2가지',
        answer: '네, 5가지 맛을 번갈아 드셔도 괜찮아요. 매일 맛을 바꿔 질리지 않게 드시는 분들도 많아요.',
    },
    {
        question: '식사 대용으로 먹어도 되나요?',
        keywords: '식사대용 끼니 아침대용 한끼 대체',
        answer: '네, 바쁜 아침에 한 끼로 드시기 좋게 만든 오트밀이에요. 우유에 타 드시면 더 든든해요.',
    },
    {
        question: '아이가 먹어도 되나요?',
        keywords: '아이 어린이 초등학생 학생 자녀 아들 딸',
        answer: '온 가족이 드시는 일반 식품이에요. 고구마·초코 맛을 아이들이 특히 좋아해요. 알레르기가 있는 아이라면 상세정보의 원재료·알레르기 표시를 먼저 확인해 주세요.',
    },
    {
        question: '다이어트 중인데 먹어도 되나요?',
        keywords: '다이어트 칼로리 살 체중 저칼로리 식단',
        answer: '한 포 열량이 186~213kcal로 가벼운 편이라 식단 관리 중에도 한 끼로 많이 드세요. 다만 체중 변화는 전체 식사와 생활 습관에 따라 달라요.',
    },

    // ---- 상품 정보 ----
    {
        question: '맛은 몇 가지예요? 어떤 맛이 있어요?',
        keywords: '맛종류 무슨맛 맛 추천 인기',
        answer: '그레인(고소한 오곡라떼 맛), 고구마(고구마라떼 맛), 단백질(단백질 17g), 서리태(검은콩 두유 맛), 초코(초코라떼 맛·단백질 13g) 5가지예요. 처음이라면 5가지를 각 2개씩 담은 맛보기 세트(10개)를 추천해요.',
    },
    {
        question: '칼로리가 얼마예요?',
        keywords: '칼로리 kcal 열량',
        answer: '한 포(50g) 기준으로 그레인 203kcal, 고구마 186kcal, 단백질 213kcal, 서리태 198kcal, 초코 199kcal예요.',
    },
    {
        question: '단백질은 얼마나 들어 있어요?',
        keywords: '단백질 함량 프로틴 g 근육',
        answer: '단백질 맛은 한 포에 단백질 17g(달걀 약 3개분), 초코 맛은 13g이 들어 있어요. 나머지 맛의 영양 정보는 상세정보의 영양성분표에서 확인해 주세요.',
    },
    {
        question: '한 포 용량이 얼마예요?',
        keywords: '용량 중량 몇그램 g 한봉',
        answer: '한 포에 50g이 들어 있어요.',
    },
    {
        question: '원재료가 뭐예요? 국산이에요?',
        keywords: '원재료 원산지 국산 귀리 곡물 성분',
        answer: '그레인은 귀리 16%와 곡물 9종, 고구마는 국산 고구마 15%, 서리태는 국산 검은콩 서리태 12%, 초코는 네덜란드산 코코아 6.9%가 들어가요. 전체 원재료와 원산지는 상세정보의 제품 표시사항에서 확인해 주세요.',
    },
    {
        question: '알레르기 성분이 있나요? 우유나 대두 들어가요?',
        keywords: '알레르기 알러지 우유 대두 밀 땅콩 성분',
        answer: '알레르기 유발 성분은 상품 상세정보의 원재료·알레르기 표시와 받으신 포장에 적혀 있어요. 알레르기가 있으시면 드시기 전에 꼭 표시사항을 확인해 주세요.',
    },
    {
        question: '소비기한(유통기한)이 얼마나 돼요? 보관은 어떻게 해요?',
        keywords: '유통기한 소비기한 보관 냉장 실온 기한',
        answer: '소비기한과 보관 방법은 상세정보의 제품 표시사항과 받으신 포장에 적혀 있어요. 개봉한 포는 한 번에 드시는 것을 권해요.',
    },
    {
        question: '단 맛이 강한가요? 당이 많나요?',
        keywords: '단맛 달아요 당류 설탕 당',
        answer: '은은한 단맛이에요. 맛별 당류는 상세정보의 영양성분표에서 확인하실 수 있어요. 덜 달게 드시려면 물에 타 드시는 걸 추천해요.',
    },

    // ---- 가격·구성 ----
    {
        question: '가격이 얼마예요?',
        keywords: '가격 얼마 개당 비용 할인',
        answer: `낱개는 ${price('single:그레인')}이에요. 세트는 10개 ${price('bundle:10')}, 20개 ${price('bundle:20')}, 30개 ${price('bundle:30')}이고, 많이 살수록 개당 가격이 내려가요.`,
    },
    {
        question: '세트 맛 구성은 어떻게 돼요? 맛을 고를 수 있나요?',
        keywords: '세트구성 맛선택 고르기 조합 믹스',
        answer: `10개 맛보기 세트는 5가지 맛이 각 2개씩 고정이에요. 20개·30개 세트는 구매할 때 맛을 ${MIX_UNIT}개 단위로 자유롭게 골라 담을 수 있어요.`,
    },
    {
        question: '낱개로도 살 수 있나요?',
        keywords: '낱개 하나씩 1개 단품',
        answer: `네, 맛별로 낱개 구매가 돼요(개당 ${price('single:그레인')}). 여러 맛을 섞어 ${BOX_SIZE}개를 채우면 배송비가 무료예요.`,
    },

    // ---- 배송 ----
    {
        question: '배송비가 얼마예요? 무료배송 되나요?',
        keywords: '배송비 택배비 무료배송 착불',
        answer: `배송비는 ${won(SHIPPING_FEE)}이에요. 세트 상품이 들어 있거나 낱개를 ${BOX_SIZE}개(한 박스) 이상 담으면 무료배송이에요.`,
    },
    {
        question: '언제 발송돼요? 배송은 얼마나 걸려요?',
        keywords: '발송 출고 배송기간 며칠 언제와요 도착',
        answer: '평일 오후 1시까지 결제하신 주문은 당일 발송하고, 그 이후나 주말·공휴일 주문은 다음 영업일에 발송해요. 발송 후 도착까지는 택배사 사정에 따라 보통 1~2일 정도 걸려요.',
    },
    {
        question: '배송 조회는 어디서 해요?',
        keywords: '배송조회 송장 운송장 택배 위치',
        answer: '마이페이지 > 주문·배송 > 주문 상세에서 택배사와 운송장 번호를 누르면 배송 위치를 확인할 수 있어요.',
    },

    // ---- 쿠폰·이벤트 ----
    {
        question: '쿠폰은 어떻게 받아요? 신규 가입 혜택이 있나요?',
        keywords: '쿠폰 할인쿠폰 가입혜택 신규 웰컴 첫구매',
        answer: `회원가입하면 ${won(WELCOME_COUPON_AMOUNT)} 쿠폰을 바로 드려요. 20·30개 세트, 정기구독, 또는 ${BOX_SIZE}개 이상 주문에 쓸 수 있고, ${COUPON_VALID_DAYS}일 동안 사용할 수 있어요.`,
    },
    {
        question: '쿠폰이 적용이 안 돼요',
        keywords: '쿠폰적용 안돼요 사용불가 쿠폰안됨',
        answer: `쿠폰은 20·30개 세트나 정기구독, 또는 낱개·맛보기 세트를 합쳐 ${BOX_SIZE}개 이상일 때 쓸 수 있어요(맛보기 세트는 10개로 계산해요). 결제 화면의 쿠폰 칸에서 조건과 남은 개수를 확인할 수 있어요.`,
    },
    {
        question: '리뷰 쓰면 혜택이 있나요?',
        keywords: '리뷰 후기 이벤트 리뷰쿠폰 적립',
        answer: `상품을 받은 뒤 마이페이지 > 리뷰 쓰기에서 리뷰 이벤트에 참여하면 글 리뷰 ${won(REVIEW_REWARD_TEXT)}, 사진 리뷰 ${won(REVIEW_REWARD_PHOTO)} 쿠폰을 바로 드려요.`,
    },

    // ---- 정기구독 ----
    {
        question: '정기구독은 어떻게 해요? 혜택이 뭐예요?',
        keywords: '정기구독 정기배송 구독 혜택 할인',
        answer: `20개·30개 세트 상세페이지에서 정기구독을 고르면 돼요. 매회 ${pct}% 추가 할인되고, 첫 회에는 쉐이커 보틀을 함께 보내 드려요.`,
    },
    {
        question: '정기구독 배송 주기를 바꿀 수 있나요? 건너뛰기도 되나요?',
        keywords: '주기변경 배송주기 건너뛰기 미루기 결제일 변경',
        answer: `네, 마이페이지 > 정기구독에서 배송 주기(${CYCLE_MIN}~${CYCLE_MAX}일, ${CYCLE_STEP}일 단위)와 다음 결제일을 바꿀 수 있어요. 결제일 전날까지 바꾸시면 돼요.`,
    },
    {
        question: '정기구독 해지는 어떻게 해요?',
        keywords: '해지 구독취소 그만 중단 위약금',
        answer: `마이페이지 > 정기구독에서 해지할 수 있어요. 정기구독은 최소 ${MIN_SUBSCRIPTION_CHARGES}회 이용 조건이 있어서, 그 전에 해지하시면 ${MIN_SUBSCRIPTION_CHARGES}회차 결제 후 자동으로 해지되도록 예약돼요.`,
    },
    {
        question: '정기구독 결제 카드를 바꾸고 싶어요',
        keywords: '카드변경 결제수단 카드바꾸기 결제카드',
        answer: '마이페이지 > 결제수단·배송지에서 새 카드를 등록한 뒤, 정기구독 화면에서 결제 카드를 바꿀 수 있어요.',
    },

    // ---- 주문·취소·교환·반품 ----
    {
        question: '주문 취소는 어떻게 해요?',
        keywords: '주문취소 취소 결제취소 환불',
        answer: '상품이 발송되기 전(결제 완료 상태)이면 마이페이지 > 주문·배송 > 주문 상세에서 바로 취소할 수 있고, 전액 환불돼요. 이미 발송됐다면 상품을 받은 뒤 교환·반품을 신청해 주세요.',
    },
    {
        question: '교환이나 반품은 어떻게 해요?',
        keywords: '교환 반품 환불 반품비 교환방법',
        answer: `마이페이지 > 주문·배송 > 주문 상세의 [교환·반품 신청]에서 접수해 주세요. 단순 변심은 받은 날부터 ${RETURN_CHANGE_OF_MIND_DAYS}일 이내 미개봉 상품만 가능하고 반품 배송비(전체 반품 ${won(RETURN_FEE_ROUND_TRIP)}, 일부 ${won(RETURN_FEE_ONE_WAY)})가 들어요. 상품 하자나 오배송은 배송비 없이 처리해 드려요.`,
    },
    {
        question: '회원가입은 어떻게 해요?',
        keywords: '회원가입 가입 로그인 카카오 네이버 구글',
        answer: '카카오·네이버·구글 계정으로 간편하게 가입할 수 있어요. 가입하면 바로 쓸 수 있는 쿠폰도 드려요.',
    },
];
