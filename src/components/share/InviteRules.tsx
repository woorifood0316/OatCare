import { COUPON_VALID_DAYS, REFERRAL_CONFIRM_DAYS, REFERRAL_REWARD, WELCOME_COUPON_MIN_COUNT } from '../../lib/catalog';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** The friend-invitation rules, shown wherever a share link is offered and in 마이페이지 (also in the terms). */
export function InviteRules() {
    return (
        <ol className="inv-rules">
            <li>
                회원이 공유한 <b>나만의 초대 링크</b>로 들어와 <b>새로 가입한 친구</b>만 인정돼요. 링크를 거치지 않고 가입하면 인정되지 않아요.
            </li>
            <li>
                친구의 <b>첫 주문이 배송 완료 후 구매 확정</b>되면 (받은 날부터 {REFERRAL_CONFIRM_DAYS}일 동안 취소·교환·반품이 없으면) <b>나와 친구 모두 {won(REFERRAL_REWARD)} 쿠폰</b>을 드려요.
            </li>
            <li>
                이런 경우에는 드리지 않아요: 친구의 <b>이름·전화번호·주소·이메일 중 2가지 이상이 기존 회원(초대한 회원 포함)과 같은 경우</b>, 첫 주문을 취소하거나 교환·반품한
                경우, 이미 가입한 회원인 경우.
            </li>
            <li>
                쿠폰은 {COUPON_VALID_DAYS}일 동안 20·30개 세트, 정기구독, 또는 {WELCOME_COUPON_MIN_COUNT}개 이상 주문에 쓸 수 있어요. <b>초대 인원 제한은 없어요.</b>
            </li>
            <li>부정한 방법(같은 사람의 여러 계정 등)으로 받은 쿠폰은 지급이 취소되거나 회수될 수 있어요.</li>
        </ol>
    );
}
