import { getSql } from './db';
import { CartLine, MIN_SUBSCRIPTION_CHARGES, giftItem, orderNameOf, priceCart, sanitizeLines } from './catalog';
import { chargeBilling, paymentLabel } from './toss';
import { getBillingKey } from './payment-methods';
import { getOrCreateCustomerKey, mapOrder, newOrderNo, type Order } from './orders';
import { addDays, todayKst } from './dates';
import { enqueue } from './notify';
import { markCouponUsed, reserveCoupon } from './coupons';
import type { Address } from './validate';
import { MAX_FAILS, RETRY_DAYS, type SubStatus, type Subscription } from './subscription-types';

export { SUB_STATUS_LABEL, MAX_FAILS, RETRY_DAYS } from './subscription-types';
export type { SubStatus, Subscription } from './subscription-types';

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
// The driver returns `date` columns as a Date at LOCAL midnight, so read them back with local getters
// (toISOString would shift the day on any server whose timezone is not UTC).
const dateOnly = (v: unknown) => {
    if (typeof v === 'string') return v.slice(0, 10);
    const d = v as Date;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function mapSubscription(r: Record<string, unknown>): Subscription {
    return {
        id: r.id as string,
        userId: (r.user_id as string | null) ?? null,
        status: r.status as SubStatus,
        lines: sanitizeLines(r.items),
        cycleDays: r.cycle_days as number,
        nextBillingDate: dateOnly(r.next_billing_date),
        skipNext: Boolean(r.skip_next),
        failCount: (r.fail_count as number) ?? 0,
        paidCount: (r.paid_count as number) ?? 0,
        cancelRequestedAt: iso(r.cancel_requested_at),
        paymentMethodId: (r.payment_method_id as string | null) ?? null,
        shipName: (r.ship_name as string | null) ?? null,
        shipPhone: (r.ship_phone as string | null) ?? null,
        shipZip: (r.ship_zip as string | null) ?? null,
        shipAddress1: (r.ship_address1 as string | null) ?? null,
        shipAddress2: (r.ship_address2 as string | null) ?? null,
        lastBilledAt: iso(r.last_billed_at),
        canceledAt: iso(r.canceled_at),
        cancelReason: (r.cancel_reason as string | null) ?? null,
        createdAt: iso(r.created_at) as string,
    };
}

export async function listSubscriptions(userId: string): Promise<Subscription[]> {
    const rows = await getSql()`
        select * from subscriptions where user_id = ${userId}
        order by (status = 'canceled'), created_at desc
    `;
    return rows.map(mapSubscription);
}

export async function getSubscription(id: string, userId?: string): Promise<Subscription | null> {
    const sql = getSql();
    const rows = userId
        ? await sql`select * from subscriptions where id = ${id} and user_id = ${userId}`
        : await sql`select * from subscriptions where id = ${id}`;
    return rows[0] ? mapSubscription(rows[0]) : null;
}

export type ChargeResult =
    | { ok: true; order: Order }
    | { ok: false; code: string; message: string; order?: Order };

export interface ChargeExtras {
    /** First-order only: coupon discount (won) and the coupon being used. */
    discount?: number;
    couponId?: string | null;
    /** First-order only: include the free shaker bottle. */
    gift?: boolean;
}

/** Create the order row and charge the saved card. Does NOT touch the subscription's schedule. */
export async function chargeSubscription(sub: Subscription, extras: ChargeExtras = {}): Promise<ChargeResult> {
    const sql = getSql();
    const priced = priceCart(sub.lines, 'subscribe');
    if (priced.error) return { ok: false, code: 'INVALID_ITEMS', message: priced.error };
    if (!sub.userId || !sub.paymentMethodId) {
        return { ok: false, code: 'NO_PAYMENT_METHOD', message: '등록된 결제수단이 없어요' };
    }
    const billingKey = await getBillingKey(sub.userId, sub.paymentMethodId);
    if (!billingKey) return { ok: false, code: 'NO_PAYMENT_METHOD', message: '등록된 결제수단을 찾을 수 없어요' };

    const discount = Math.max(0, extras.discount ?? 0);
    const amount = priced.total - discount;
    const items = extras.gift ? [...priced.items, giftItem()] : priced.items;

    const customerKey = await getOrCreateCustomerKey(sub.userId);
    const user = await sql`select name, email from users where id = ${sub.userId}`;
    const orderNo = newOrderNo();

    const inserted = await sql`
        insert into orders (order_no, user_id, kind, subscription_id, status, items, subtotal, shipping_fee, amount,
            discount_amount, ship_name, ship_phone, ship_zip, ship_address1, ship_address2)
        values (${orderNo}, ${sub.userId}, 'subscription', ${sub.id}, 'pending', ${JSON.stringify(items)}::jsonb,
            ${priced.subtotal}, ${priced.shipping}, ${amount}, ${discount},
            ${sub.shipName}, ${sub.shipPhone}, ${sub.shipZip}, ${sub.shipAddress1}, ${sub.shipAddress2})
        returning *
    `;
    const order = mapOrder(inserted[0]);

    if (extras.couponId) {
        const held = await reserveCoupon(sub.userId, extras.couponId, order.id);
        if (!held) {
            await sql`update orders set status = 'failed', fail_reason = '쿠폰을 사용할 수 없어요', updated_at = now() where id = ${order.id}`;
            return { ok: false, code: 'COUPON_UNAVAILABLE', message: '쿠폰을 사용할 수 없어요. 쿠폰 없이 다시 시도해 주세요.', order };
        }
        await sql`update orders set coupon_id = ${extras.couponId} where id = ${order.id}`;
    }

    const res = await chargeBilling({
        billingKey,
        customerKey,
        amount,
        orderId: orderNo,
        orderName: orderNameOf(priced.items),
        customerEmail: (user[0]?.email as string | null) ?? null,
        customerName: sub.shipName ?? ((user[0]?.name as string | null) ?? null),
    });

    if (!res.ok) {
        const reason = `${res.code}: ${res.message}`.slice(0, 300);
        // A failed order frees its coupon automatically (see coupons.ts).
        await sql`update orders set status = 'failed', fail_reason = ${reason}, updated_at = now() where id = ${order.id}`;
        await sql`insert into billing_attempts (subscription_id, order_id, ok, error_code, error_message)
                  values (${sub.id}, ${order.id}, false, ${res.code}, ${res.message.slice(0, 300)})`;
        return { ok: false, code: res.code, message: res.message, order };
    }

    const paid = await sql`
        update orders set status = 'paid', payment_key = ${res.data.paymentKey}, key_type = 'api',
            payment_label = ${paymentLabel(res.data)}, paid_at = now(), updated_at = now()
        where id = ${order.id} returning *
    `;
    await sql`insert into billing_attempts (subscription_id, order_id, ok) values (${sub.id}, ${order.id}, true)`;
    if (extras.couponId) await markCouponUsed(order.id);
    if (extras.gift) await sql`update users set shaker_gifted_at = now() where id = ${sub.userId} and shaker_gifted_at is null`;
    return { ok: true, order: mapOrder(paid[0]) };
}

/**
 * Schedule bookkeeping after a successful charge: counts the payment and, if the customer had asked to cancel
 * during the minimum period, ends the subscription now that the minimum has been paid.
 */
export async function markCharged(sub: Subscription): Promise<{ status: SubStatus; endedNow: boolean }> {
    const rows = await getSql()`
        update subscriptions set
            last_billed_at = now(), fail_count = 0, skip_next = false, processing_at = null,
            paid_count = paid_count + 1,
            next_billing_date = ${addDays(todayKst(), sub.cycleDays)},
            status = case when cancel_requested_at is not null and paid_count + 1 >= ${MIN_SUBSCRIPTION_CHARGES}
                          then 'canceled' else 'active' end,
            canceled_at = case when cancel_requested_at is not null and paid_count + 1 >= ${MIN_SUBSCRIPTION_CHARGES}
                               then now() else canceled_at end,
            cancel_reason = case when cancel_requested_at is not null and paid_count + 1 >= ${MIN_SUBSCRIPTION_CHARGES}
                                 then coalesce(cancel_reason, '고객 해지 (최소 이용기간 종료)') else cancel_reason end,
            updated_at = now()
        where id = ${sub.id}
        returning status
    `;
    const status = (rows[0]?.status as SubStatus) ?? 'active';
    const endedNow = status === 'canceled';
    if (endedNow) {
        await enqueue('subscription_canceled', { subscriptionId: sub.id, reason: '최소 이용기간(2회) 종료 후 해지' }, { userId: sub.userId });
    }
    return { status, endedNow };
}

export interface FirstChargeInput {
    userId: string;
    lines: CartLine[];
    cycleDays: number;
    address: Address;
    paymentMethodId: string;
    discount?: number;
    couponId?: string | null;
    gift?: boolean;
}

/** New subscription + first charge. On failure the subscription is cancelled (nothing is left half-open). */
export async function startSubscription(input: FirstChargeInput): Promise<ChargeResult & { subscriptionId?: string }> {
    const sql = getSql();
    const a = input.address;
    const created = await sql`
        insert into subscriptions (user_id, status, items, cycle_days, next_billing_date, payment_method_id,
            ship_name, ship_phone, ship_zip, ship_address1, ship_address2)
        values (${input.userId}, 'active', ${JSON.stringify(input.lines)}::jsonb, ${input.cycleDays},
            ${addDays(todayKst(), input.cycleDays)}, ${input.paymentMethodId},
            ${a.recipient}, ${a.phone}, ${a.zipcode}, ${a.address1}, ${a.address2})
        returning *
    `;
    const sub = mapSubscription(created[0]);
    const result = await chargeSubscription(sub, { discount: input.discount, couponId: input.couponId, gift: input.gift });

    if (!result.ok) {
        await sql`update subscriptions set status = 'canceled', canceled_at = now(), cancel_reason = '첫 결제 실패', updated_at = now()
                  where id = ${sub.id}`;
        return { ...result, subscriptionId: sub.id };
    }
    await markCharged(sub);
    await enqueue(
        'subscription_started',
        { subscriptionId: sub.id, orderNo: result.order.orderNo, amount: result.order.amount, cycleDays: input.cycleDays },
        { userId: input.userId },
    );
    return { ...result, subscriptionId: sub.id };
}

export type DueOutcome = 'charged' | 'skipped' | 'failed' | 'suspended' | 'busy';

/** Process one due subscription (called by the daily billing job). */
export async function processDueSubscription(id: string): Promise<{ id: string; outcome: DueOutcome; detail?: string }> {
    const sql = getSql();
    const today = todayKst();
    // Claim it so two overlapping job runs never charge the same subscription twice.
    const claimed = await sql`
        update subscriptions set processing_at = now()
        where id = ${id} and status = 'active' and next_billing_date <= ${today}
          and (processing_at is null or processing_at < now() - interval '10 minutes')
        returning *
    `;
    if (claimed.length === 0) return { id, outcome: 'busy' };
    const sub = mapSubscription(claimed[0]);

    try {
        if (sub.skipNext) {
            await sql`update subscriptions set skip_next = false, processing_at = null,
                      next_billing_date = ${addDays(sub.nextBillingDate, sub.cycleDays)}, updated_at = now() where id = ${sub.id}`;
            return { id, outcome: 'skipped' };
        }

        const result = await chargeSubscription(sub);
        if (result.ok) {
            await markCharged(sub);
            await enqueue(
                'subscription_charged',
                { subscriptionId: sub.id, orderNo: result.order.orderNo, amount: result.order.amount },
                { userId: sub.userId },
            );
            return { id, outcome: 'charged' };
        }

        const fails = sub.failCount + 1;
        if (fails >= MAX_FAILS) {
            await sql`update subscriptions set status = 'past_due', fail_count = ${fails}, processing_at = null, updated_at = now() where id = ${sub.id}`;
            await enqueue('subscription_paused', { subscriptionId: sub.id, reason: result.message }, { userId: sub.userId });
            return { id, outcome: 'suspended', detail: result.message };
        }
        await sql`update subscriptions set fail_count = ${fails}, processing_at = null,
                  next_billing_date = ${addDays(today, RETRY_DAYS)}, updated_at = now() where id = ${sub.id}`;
        await enqueue(
            'subscription_charge_failed',
            { subscriptionId: sub.id, reason: result.message, retryInDays: RETRY_DAYS, failCount: fails },
            { userId: sub.userId },
        );
        return { id, outcome: 'failed', detail: result.message };
    } catch (e) {
        // Unexpected error: release the claim so the next run can try again.
        await sql`update subscriptions set processing_at = null where id = ${sub.id}`;
        throw e;
    }
}

export async function dueSubscriptionIds(limit = 20): Promise<string[]> {
    const rows = await getSql()`
        select id from subscriptions
        where status = 'active' and next_billing_date <= ${todayKst()}
        order by next_billing_date asc limit ${limit}
    `;
    return rows.map((r) => r.id as string);
}

/** Subscriptions that must still be paid to reach the minimum period (blocks pausing, skipping, withdrawal). */
export function inMinimumPeriod(sub: Pick<Subscription, 'status' | 'paidCount'>): boolean {
    return sub.status !== 'canceled' && sub.paidCount < MIN_SUBSCRIPTION_CHARGES;
}
