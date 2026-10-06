// Pure types/constants for subscriptions, safe to import from client components.
import type { CartLine } from './catalog';

export type SubStatus = 'active' | 'paused' | 'past_due' | 'canceled';

export const SUB_STATUS_LABEL: Record<SubStatus, string> = {
    active: '이용 중',
    paused: '일시정지',
    past_due: '결제 실패 (확인 필요)',
    canceled: '해지됨',
};

/** After this many failed charges in a row the subscription stops until the customer fixes payment. */
export const MAX_FAILS = 3;
export const RETRY_DAYS = 3;

export interface Subscription {
    id: string;
    userId: string | null;
    status: SubStatus;
    lines: CartLine[];
    cycleDays: number;
    nextBillingDate: string;
    skipNext: boolean;
    failCount: number;
    /** Number of successful charges so far. */
    paidCount: number;
    /** Set when the customer asked to cancel before the minimum period ended. */
    cancelRequestedAt: string | null;
    paymentMethodId: string | null;
    shipName: string | null;
    shipPhone: string | null;
    shipZip: string | null;
    shipAddress1: string | null;
    shipAddress2: string | null;
    lastBilledAt: string | null;
    canceledAt: string | null;
    cancelReason: string | null;
    createdAt: string;
}
