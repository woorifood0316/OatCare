// Toss Payments server-side API client (edge-safe: plain fetch).
//  - 'widget' keys (gsk): one-time payments made with the payment widget
//  - 'api'    keys (sk) : billing (auto-pay) and anything created with them
// A payment must be confirmed / cancelled with the same key set that created it.

// Overridable so tests can point at a local mock instead of Toss.
const BASE = process.env.TOSS_API_BASE || 'https://api.tosspayments.com';

export type KeySet = 'widget' | 'api';

export interface TossError {
    ok: false;
    status: number;
    code: string;
    message: string;
}
export type TossResult<T> = { ok: true; data: T } | TossError;

function secretFor(keySet: KeySet): string {
    const secret = keySet === 'widget' ? process.env.TOSS_WIDGET_SECRET_KEY : process.env.TOSS_API_SECRET_KEY;
    if (!secret) throw new Error(`Toss ${keySet} secret key is not configured`);
    return secret;
}

async function toss<T>(
    keySet: KeySet,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    idempotencyKey?: string,
): Promise<TossResult<T>> {
    const res = await fetch(BASE + path, {
        method,
        headers: {
            Authorization: `Basic ${btoa(`${secretFor(keySet)}:`)}`,
            'Content-Type': 'application/json',
            ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data: Record<string, unknown> = {};
    try {
        data = await res.json();
    } catch {
        /* non-JSON error */
    }
    if (!res.ok) {
        return {
            ok: false,
            status: res.status,
            code: String(data.code ?? 'UNKNOWN'),
            message: String(data.message ?? '결제 처리 중 오류가 발생했어요'),
        };
    }
    return { ok: true, data: data as T };
}

export interface TossPayment {
    paymentKey: string;
    orderId: string;
    status: string;
    totalAmount: number;
    method?: string;
    approvedAt?: string;
    card?: { company?: string; number?: string; cardType?: string; issuerCode?: string };
    easyPay?: { provider?: string };
    virtualAccount?: unknown;
}

/** Human readable payment label for receipts ("신한카드 ****1234", "토스페이" ...). */
export function paymentLabel(p: TossPayment): string {
    if (p.easyPay?.provider) return p.easyPay.provider;
    if (p.card?.company) return `${p.card.company}${p.card.number ? ` ${p.card.number.slice(-4)}` : ''}`;
    return p.method ?? '';
}

export function confirmPayment(paymentKey: string, orderId: string, amount: number) {
    return toss<TossPayment>('widget', 'POST', '/v1/payments/confirm', { paymentKey, orderId, amount }, `confirm-${orderId}`);
}

export function cancelPayment(keySet: KeySet, paymentKey: string, reason: string, amount?: number) {
    return toss<TossPayment>(
        keySet,
        'POST',
        `/v1/payments/${encodeURIComponent(paymentKey)}/cancel`,
        { cancelReason: reason, ...(amount !== undefined ? { cancelAmount: amount } : {}) },
        `cancel-${paymentKey}-${amount ?? 'all'}`,
    );
}

export interface BillingKeyResult {
    billingKey: string;
    customerKey: string;
    cardCompany?: string;
    cardNumber?: string;
    card?: { issuerCode?: string; acquirerCode?: string; number?: string; cardType?: string; ownerType?: string };
}

export function issueBillingKey(authKey: string, customerKey: string) {
    return toss<BillingKeyResult>('api', 'POST', '/v1/billing/authorizations/issue', { authKey, customerKey });
}

export interface ChargeInput {
    billingKey: string;
    customerKey: string;
    amount: number;
    orderId: string;
    orderName: string;
    customerEmail?: string | null;
    customerName?: string | null;
}

export function chargeBilling(input: ChargeInput) {
    const { billingKey, ...rest } = input;
    return toss<TossPayment>(
        'api',
        'POST',
        `/v1/billing/${encodeURIComponent(billingKey)}`,
        {
            customerKey: rest.customerKey,
            amount: rest.amount,
            orderId: rest.orderId,
            orderName: rest.orderName,
            ...(rest.customerEmail ? { customerEmail: rest.customerEmail } : {}),
            ...(rest.customerName ? { customerName: rest.customerName } : {}),
        },
        `charge-${rest.orderId}`,
    );
}
