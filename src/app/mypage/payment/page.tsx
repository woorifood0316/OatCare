import { ComingSoon } from '../../../components/mypage/ComingSoon';

export default function PaymentPage() {
    return (
        <ComingSoon
            title="결제수단·배송지"
            desc="정기결제에 사용할 카드와 배송지를 관리해요."
            items={['정기결제 카드 등록 · 변경', '배송지 추가 · 수정 · 기본 배송지 설정']}
        />
    );
}
