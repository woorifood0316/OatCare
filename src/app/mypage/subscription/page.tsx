import { ComingSoon } from '../../../components/mypage/ComingSoon';

export default function SubscriptionPage() {
    return (
        <ComingSoon
            title="정기구독"
            desc="20일·30일 단위로 자동 배송되는 정기구독을 관리해요."
            items={['구독 주기 변경 (20일·30일·직접 지정)', '다음 결제일 변경 · 이번 회차 건너뛰기', '일시정지 · 해지', '구성(맛·수량) 변경']}
        />
    );
}
