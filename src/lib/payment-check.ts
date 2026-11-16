// What really happened to a payment when the first answer was unclear. Server only.
import { getPayment, getPaymentByOrderId, type KeySet, type TossPayment } from './toss';

/** Before this, a payment not found may still be on its way (the charge request waits up to 25 seconds). */
export const NOT_FOUND_SETTLE_MS = 3 * 60 * 1000;

export type Lookup =
    /** approved: complete the order */
    | { state: 'paid'; payment: TossPayment }
    /** not approved, nothing was taken: the order failed (a new try may be made) */
    | { state: 'failed'; reason: string }
    /** still unknown: keep the order 결제 확인 중 and look again later */
    | { state: 'unknown'; reason: string };

/**
 * Ask the payment company. `paymentKey` for widget payments, otherwise our order number. `since` is when the
 * order was tried: "no such payment" only counts as failed once enough time has passed.
 */
export async function lookupPayment(opts: { keySet: KeySet; orderNo: string; amount: number; paymentKey?: string | null; since: Date }): Promise<Lookup> {
    const res = opts.paymentKey ? await getPayment(opts.keySet, opts.paymentKey) : await getPaymentByOrderId(opts.keySet, opts.orderNo);
    if (!res.ok) {
        if (res.status === 404 || res.code === 'NOT_FOUND_PAYMENT' || res.code === 'NOT_FOUND') {
            return Date.now() - opts.since.getTime() >= NOT_FOUND_SETTLE_MS
                ? { state: 'failed', reason: '결제사에 결제 내역이 없어요 (청구되지 않음)' }
                : { state: 'unknown', reason: '결제사 처리 대기' };
        }
        return { state: 'unknown', reason: `조회 실패 ${res.code}` };
    }
    const p = res.data;
    if (p.orderId && p.orderId !== opts.orderNo) return { state: 'unknown', reason: '결제사 주문번호 불일치' };
    switch (p.status) {
        case 'DONE':
            if (p.totalAmount !== opts.amount) return { state: 'unknown', reason: `결제 금액 불일치 (${p.totalAmount})` };
            return { state: 'paid', payment: p };
        case 'ABORTED':
        case 'EXPIRED':
            return { state: 'failed', reason: `결제 승인 안 됨 (${p.status})` };
        case 'CANCELED':
        case 'PARTIAL_CANCELED':
            // approved and then cancelled at the payment company: nothing is owed for this order
            return { state: 'failed', reason: `결제사에서 취소됨 (${p.status})` };
        default:
            return { state: 'unknown', reason: `결제 진행 중 (${p.status})` };
    }
}
