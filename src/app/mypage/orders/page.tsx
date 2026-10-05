import { ComingSoon } from '../../../components/mypage/ComingSoon';

export default function OrdersPage() {
    return (
        <ComingSoon
            title="주문·배송"
            desc="주문 내역과 배송 현황을 확인해요."
            items={['주문 내역과 결제 상세', '배송 상태 · 운송장 조회', '주문 취소 · 교환 · 반품 요청']}
        />
    );
}
