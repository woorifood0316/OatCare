import { RETURN_CHANGE_OF_MIND_DAYS, RETURN_DEFECT_MONTHS, RETURN_FEE_ONE_WAY, RETURN_FEE_ROUND_TRIP } from './catalog';
import type { Order } from './orders';

// Pure rules (no database): safe to import in the browser for the live refund estimate.

export type ReturnKind = 'refund' | 'exchange';
export type ReturnReason = 'change_of_mind' | 'defect' | 'wrong_item';
export type ReturnStatus = 'requested' | 'approved' | 'completed' | 'rejected' | 'withdrawn';

export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
    change_of_mind: '단순 변심',
    defect: '상품 하자·파손',
    wrong_item: '오배송 (다른 상품·수량)',
};
export const RETURN_TYPE_LABEL: Record<ReturnKind, string> = { refund: '반품 (환불)', exchange: '교환 (같은 상품 재발송)' };
export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
    requested: '접수됨',
    approved: '회수 진행 중',
    completed: '처리 완료',
    rejected: '접수 반려',
    withdrawn: '신청 취소',
};

/** Short badge for the order list, e.g. "반품 회수 중". */
export const RETURN_BADGE: Record<ReturnStatus, string> = { requested: '접수', approved: '회수 중', completed: '완료', rejected: '반려', withdrawn: '취소' };

export interface ReturnLine {
    index: number;
    name: string;
    qty: number;
}

export interface ReturnRequest {
    id: string;
    orderId: string;
    orderNo: string;
    userId: string | null;
    type: ReturnKind;
    reason: ReturnReason;
    detail: string;
    items: ReturnLine[];
    photos: string[];
    returnFee: number;
    refundEstimate: number;
    refundAmount: number | null;
    status: ReturnStatus;
    adminNote: string | null;
    rejectReason: string | null;
    createdAt: string;
    completedAt: string | null;
}

const DAY = 24 * 3600 * 1000;

/**
 * When the customer got the parcel. The 배송 완료 date when the shop recorded it; otherwise 2 days after dispatch
 * (counted in the customer's favour: a later "received" date gives a longer window).
 */
export function receivedAt(order: Order): Date | null {
    if (order.deliveredAt) return new Date(order.deliveredAt);
    if (order.shippedAt) return new Date(new Date(order.shippedAt).getTime() + 2 * DAY);
    return null;
}

/** End of the given KST day, as an instant. */
function endOfKstDay(d: Date): Date {
    const kst = new Date(d.getTime() + 9 * 3600 * 1000);
    const end = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 23, 59, 59, 999);
    return new Date(end - 9 * 3600 * 1000);
}

export interface ReturnWindow {
    /** The order can be asked about at all (shipped / delivered). */
    open: boolean;
    changeOfMindUntil: Date | null;
    defectUntil: Date | null;
    changeOfMind: boolean;
    defect: boolean;
}

export function returnWindow(order: Order, now = new Date()): ReturnWindow {
    const got = receivedAt(order);
    const shipped = order.status === 'shipped' || order.status === 'delivered';
    if (!shipped || !got) return { open: false, changeOfMindUntil: null, defectUntil: null, changeOfMind: false, defect: false };
    const changeOfMindUntil = endOfKstDay(new Date(got.getTime() + RETURN_CHANGE_OF_MIND_DAYS * DAY));
    const d = new Date(got);
    d.setUTCMonth(d.getUTCMonth() + RETURN_DEFECT_MONTHS);
    const defectUntil = endOfKstDay(d);
    const changeOfMind = now <= changeOfMindUntil;
    const defect = now <= defectUntil;
    return { open: changeOfMind || defect, changeOfMindUntil, defectUntil, changeOfMind, defect };
}

/** Lines that can still be returned: gifts excluded, quantities already in an open or completed request taken off. */
export function returnableLines(order: Order, existing: ReturnRequest[]): ReturnLine[] {
    const taken = new Map<number, number>();
    for (const r of existing) {
        if (r.status === 'rejected' || r.status === 'withdrawn') continue;
        for (const l of r.items) taken.set(l.index, (taken.get(l.index) ?? 0) + l.qty);
    }
    return order.items
        .map((it, index) => ({ index, name: it.name, qty: it.qty - (taken.get(index) ?? 0), gift: it.gift }))
        .filter((l) => !l.gift && l.qty > 0)
        .map(({ index, name, qty }) => ({ index, name, qty }));
}

/**
 * Return fee and the refund the customer can expect.
 *  - 단순 변심, whole order: the customer bears the round trip (6,000원). If they paid the 3,000원 delivery at checkout,
 *    that is kept and 3,000원 more is taken off, so it is 6,000원 either way.
 *  - 단순 변심, part of the order: 3,000원 (one way).
 *  - 하자·오배송: nothing; the shop pays.
 * Part refunds share the coupon discount in proportion to the lines' price.
 */
export function estimateRefund(order: Order, type: ReturnKind, reason: ReturnReason, lines: ReturnLine[], alreadyRefunded = 0) {
    if (type === 'exchange') return { fee: 0, refund: 0, whole: false };
    const paidLines = order.items.map((it, index) => ({ it, index })).filter(({ it }) => !it.gift);
    const whole =
        alreadyRefunded === 0 && paidLines.every(({ it, index }) => (lines.find((l) => l.index === index)?.qty ?? 0) >= it.qty);
    const fee = reason === 'change_of_mind' ? (whole ? RETURN_FEE_ROUND_TRIP : RETURN_FEE_ONE_WAY) : 0;

    let base: number;
    if (whole) {
        base = order.amount;
    } else {
        const lineSum = lines.reduce((sum, l) => {
            const it = order.items[l.index];
            return it ? sum + Math.round((it.amount * l.qty) / it.qty) : sum;
        }, 0);
        const ratio = order.subtotal > 0 ? (order.subtotal - order.discountAmount) / order.subtotal : 1;
        base = Math.round(lineSum * ratio);
    }
    const left = Math.max(order.amount - alreadyRefunded, 0);
    const refund = Math.max(Math.min(base - fee, left), 0);
    return { fee, refund, whole };
}

