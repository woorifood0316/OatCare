import type { NotifyEvent } from './notify';

const SITE = () => process.env.SITE_URL || 'https://chamoatcare.com';
const won = (n: unknown) => `${Number(n ?? 0).toLocaleString('ko-KR')}원`;

export interface Message {
    subject: string;
    text: string;
}

type P = Record<string, unknown>;

/** Text sent to the customer (email today; the same text can feed KakaoTalk later). */
export function customerMessage(event: NotifyEvent, p: P): Message | null {
    const order = p.orderNo ? `${SITE()}/mypage/orders/${p.orderNo}` : `${SITE()}/mypage/orders`;
    const sub = `${SITE()}/mypage/subscription`;
    switch (event) {
        case 'order_paid':
            return { subject: `[참오트케어] 주문이 완료됐어요 (${p.orderNo})`, text: `주문해 주셔서 감사합니다.\n\n주문번호: ${p.orderNo}\n결제 금액: ${won(p.amount)}\n\n주문 내역: ${order}` };
        case 'order_canceled':
            return { subject: `[참오트케어] 주문이 취소됐어요 (${p.orderNo})`, text: `주문이 취소되어 ${won(p.amount)}이 환불돼요. (카드사에 따라 영업일 기준 3~5일 소요)\n\n주문번호: ${p.orderNo}` };
        case 'order_shipped':
            return { subject: `[참오트케어] 상품이 출발했어요 (${p.orderNo})`, text: `상품이 발송됐어요.\n\n택배사: ${p.carrier}\n운송장 번호: ${p.trackingNo}\n\n주문 내역: ${order}` };
        case 'subscription_started':
            return { subject: '[참오트케어] 정기구독이 시작됐어요', text: `${p.cycleDays}일마다 자동 결제·배송돼요. 첫 회차 결제 금액은 ${won(p.amount)}이에요.\n\n구독 관리(주기 변경·건너뛰기·해지): ${sub}` };
        case 'subscription_charged':
            return { subject: `[참오트케어] 정기구독 결제가 완료됐어요 (${p.orderNo})`, text: `정기구독 ${won(p.amount)}이 결제됐어요.\n\n주문 내역: ${order}\n구독 관리: ${sub}` };
        case 'subscription_charge_failed':
            return { subject: '[참오트케어] 정기구독 결제에 실패했어요', text: `카드 결제에 실패했어요. (${p.reason})\n${p.retryInDays}일 뒤에 다시 시도하며, 지금 카드를 확인하거나 바로 결제할 수 있어요.\n\n구독 관리: ${sub}` };
        case 'subscription_paused':
            return { subject: '[참오트케어] 정기구독이 일시정지됐어요', text: `결제가 반복해서 실패해 정기구독이 멈췄어요. 카드를 확인한 뒤 구독 관리에서 다시 결제해 주세요.\n\n${sub}` };
        case 'subscription_canceled':
            return { subject: '[참오트케어] 정기구독이 해지됐어요', text: `정기구독이 해지되어 이후 결제와 배송이 중단돼요. 언제든 다시 시작할 수 있어요.\n\n${SITE()}` };
        case 'billing_upcoming':
            return { subject: '[참오트케어] 정기구독 결제 예정 안내', text: `${p.date}에 ${won(p.amount)}이 자동 결제될 예정이에요.\n주기 변경, 건너뛰기, 해지는 결제일 전날까지 가능해요.\n\n구독 관리: ${sub}` };
        default:
            return null;
    }
}

/** One-line text for the operator (webhook / chat). */
export function adminMessage(event: NotifyEvent, p: P): string {
    switch (event) {
        case 'order_paid':
            return `🛒 새 주문 ${p.orderNo} · ${won(p.amount)}`;
        case 'order_canceled':
            return `↩️ 주문 취소 ${p.orderNo} · ${won(p.amount)} (${p.reason ?? ''})`;
        case 'order_shipped':
            return `📦 발송 처리 ${p.orderNo} · ${p.carrier} ${p.trackingNo}`;
        case 'subscription_started':
            return `🔁 새 정기구독 (${p.cycleDays}일 주기) · 첫 결제 ${won(p.amount)}`;
        case 'subscription_charged':
            return `💳 정기결제 성공 ${p.orderNo} · ${won(p.amount)}`;
        case 'subscription_charge_failed':
            return `⚠️ 정기결제 실패 (${p.failCount}회) · ${p.reason}`;
        case 'subscription_paused':
            return `⛔ 정기구독 정지 · ${p.reason}`;
        case 'subscription_canceled':
            return `🛑 정기구독 해지 · ${p.reason ?? ''}`;
        case 'billing_upcoming':
            return `⏰ 결제 예정 안내 발송 · ${p.date}`;
        default:
            return String(event);
    }
}
