import { getSql } from './db';
import { CartLine, MIN_SUBSCRIPTION_CHARGES, giftItem, orderNameOf, priceCart, sanitizeLines } from './catalog';
import { chargeBilling, isUncertain, paymentLabel, type TossPayment } from './toss';
import { lookupPayment } from './payment-check';
import { getBillingKey } from './payment-methods';
import { getOrCreateCustomerKey, getOrderByNo, mapOrder, newOrderNo, type Order } from './orders';
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

const PAID_LIKE = ['paid', 'preparing', 'shipped', 'delivered'];
export const CHECKING_MESSAGE = '결제 결과를 확인하고 있어요. 다시 결제하지 말고 잠시 후 주문 내역을 확인해 주세요.';

/** Complete a subscription order the payment company approved. Only the first caller gets the order back (side effects run once). */
export async function completeSubscriptionOrder(orderId: string, payment: TossPayment): Promise<Order | null> {
    const sql = getSql();
    const paid = await sql`
        update orders set status = 'paid', payment_key = ${payment.paymentKey}, key_type = 'api',
            payment_label = ${paymentLabel(payment)}, paid_at = now(), fail_reason = null, updated_at = now()
        where id = ${orderId} and status in ('pending', 'checking') returning *
    `;
    if (paid.length === 0) return null;
    const order = mapOrder(paid[0]);
    await sql`insert into billing_attempts (subscription_id, order_id, ok) values (${order.subscriptionId}, ${order.id}, true)`;
    await markCouponUsed(order.id);
    if (order.items.some((i) => i.gift) && order.userId) {
        await sql`update users set shaker_gifted_at = now() where id = ${order.userId} and shaker_gifted_at is null`;
    }
    return order;
}

export async function failSubscriptionOrder(orderId: string, reason: string, subscriptionId: string | null, code: string): Promise<boolean> {
    const sql = getSql();
    // A failed order frees its coupon automatically (see coupons.ts).
    const r = await sql`update orders set status = 'failed', fail_reason = ${reason.slice(0, 300)}, updated_at = now()
                        where id = ${orderId} and status in ('pending', 'checking') returning id`;
    if (r.length > 0 && subscriptionId) {
        await sql`insert into billing_attempts (subscription_id, order_id, ok, error_code, error_message)
                  values (${subscriptionId}, ${orderId}, false, ${code}, ${reason.slice(0, 300)})`;
    }
    return r.length > 0;
}

/**
 * Charge the saved card for the subscription's next round (paid_count + 1). Does NOT touch the schedule.
 *  - The round already approved: that order is returned, nothing is charged.
 *  - An unresolved try of this round (no clear answer last time): it is looked up at the payment company and
 *    completed, failed, or left 결제 확인 중 - never charged again under a new number while unclear.
 *  - Otherwise a new try (order) for this round. The database allows only one unresolved try per round, so two
 *    runs at once cannot both charge.
 * A clear refusal (card declined, limit) fails the try; the next try of the round then gets a new order number.
 */
export async function chargeSubscription(sub: Subscription, extras: ChargeExtras = {}): Promise<ChargeResult> {
    const sql = getSql();
    const round = sub.paidCount + 1;

    const approved = await sql`select * from orders where subscription_id = ${sub.id} and charge_no = ${round} and status = any(${PAID_LIKE}) limit 1`;
    if (approved[0]) return { ok: true, order: mapOrder(approved[0]) };

    const open = await sql`select * from orders where subscription_id = ${sub.id} and charge_no = ${round} and status in ('pending', 'checking') limit 1`;
    if (open[0]) {
        const prev = mapOrder(open[0]);
        const seen = await lookupPayment({ keySet: 'api', orderNo: prev.orderNo, amount: prev.amount, since: new Date(prev.createdAt) });
        if (seen.state === 'paid') {
            const done = (await completeSubscriptionOrder(prev.id, seen.payment)) ?? (await getOrderByNo(prev.orderNo));
            return done ? { ok: true, order: done } : { ok: false, code: 'CHECKING', message: CHECKING_MESSAGE, order: prev };
        }
        if (seen.state === 'unknown') {
            await sql`update orders set status = 'checking', fail_reason = ${seen.reason}, updated_at = now() where id = ${prev.id} and status = 'pending'`;
            return { ok: false, code: 'CHECKING', message: CHECKING_MESSAGE, order: prev };
        }
        await failSubscriptionOrder(prev.id, seen.reason, sub.id, 'NOT_CHARGED');
        // nothing was taken for that try: go on with a new one
    }

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

    let inserted;
    try {
        inserted = await sql`
            insert into orders (order_no, user_id, kind, subscription_id, charge_no, status, items, subtotal, shipping_fee, amount,
                discount_amount, ship_name, ship_phone, ship_zip, ship_address1, ship_address2)
            values (${orderNo}, ${sub.userId}, 'subscription', ${sub.id}, ${round}, 'pending', ${JSON.stringify(items)}::jsonb,
                ${priced.subtotal}, ${priced.shipping}, ${amount}, ${discount},
                ${sub.shipName}, ${sub.shipPhone}, ${sub.shipZip}, ${sub.shipAddress1}, ${sub.shipAddress2})
            returning *
        `;
    } catch (e) {
        // another run opened a try for this round at the same moment: that one goes on, this one stops
        if (String((e as { code?: string }).code) === '23505') return { ok: false, code: 'BUSY', message: '이미 결제를 진행하고 있어요. 잠시 후 확인해 주세요.' };
        throw e;
    }
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

    if (res.ok) {
        const done = (await completeSubscriptionOrder(order.id, res.data)) ?? (await getOrderByNo(orderNo));
        return done ? { ok: true, order: done } : { ok: false, code: 'CHECKING', message: CHECKING_MESSAGE, order };
    }

    if (isUncertain(res)) {
        // No clear answer: ask what happened before deciding. Still unclear -> 결제 확인 중 (the coupon stays held).
        const seen = await lookupPayment({ keySet: 'api', orderNo, amount, since: new Date(order.createdAt) });
        if (seen.state === 'paid') {
            const done = (await completeSubscriptionOrder(order.id, seen.payment)) ?? (await getOrderByNo(orderNo));
            return done ? { ok: true, order: done } : { ok: false, code: 'CHECKING', message: CHECKING_MESSAGE, order };
        }
        if (seen.state === 'unknown') {
            await sql`update orders set status = 'checking', fail_reason = ${`${res.code}: ${seen.reason}`.slice(0, 300)}, updated_at = now()
                      where id = ${order.id} and status = 'pending'`;
            return { ok: false, code: 'CHECKING', message: CHECKING_MESSAGE, order };
        }
        await failSubscriptionOrder(order.id, `${res.code}: ${seen.reason}`, sub.id, res.code);
        return { ok: false, code: res.code, message: res.message, order };
    }

    await failSubscriptionOrder(order.id, `${res.code}: ${res.message}`, sub.id, res.code);
    return { ok: false, code: res.code, message: res.message, order };
}

/**
 * Schedule bookkeeping after a successful charge: counts the payment and, if the customer had asked to cancel
 * during the minimum period, ends the subscription now that the minimum has been paid.
 * Counted once per round: only while paid_count is still what it was before that round (`counted`).
 */
export async function markCharged(sub: Subscription): Promise<{ status: SubStatus; endedNow: boolean; counted: boolean }> {
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
        where id = ${sub.id} and paid_count = ${sub.paidCount}
        returning status
    `;
    if (rows.length === 0) return { status: sub.status, endedNow: false, counted: false };
    const status = (rows[0]?.status as SubStatus) ?? 'active';
    const endedNow = status === 'canceled';
    if (endedNow) {
        await enqueue('subscription_canceled', { subscriptionId: sub.id, reason: '최소 이용기간(2회) 종료 후 해지' }, { userId: sub.userId });
    }
    return { status, endedNow, counted: true };
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
        // No clear answer yet: the subscription stays; the job completes it (or cancels it) once the result is known.
        if (result.code === 'CHECKING' || result.code === 'BUSY') return { ...result, subscriptionId: sub.id };
        await sql`update subscriptions set status = 'canceled', canceled_at = now(), cancel_reason = '첫 결제 실패', updated_at = now()
                  where id = ${sub.id}`;
        return { ...result, subscriptionId: sub.id };
    }
    const counted = await markCharged(sub);
    if (counted.counted) await enqueue(
        'subscription_started',
        { subscriptionId: sub.id, orderNo: result.order.orderNo, amount: result.order.amount, cycleDays: input.cycleDays },
        { userId: input.userId },
    );
    return { ...result, subscriptionId: sub.id };
}

export type DueOutcome = 'charged' | 'skipped' | 'failed' | 'suspended' | 'busy' | 'checking';

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
            const counted = await markCharged(sub);
            if (counted.counted) await enqueue(
                'subscription_charged',
                { subscriptionId: sub.id, orderNo: result.order.orderNo, amount: result.order.amount },
                { userId: sub.userId },
            );
            return { id, outcome: 'charged' };
        }

        if (result.code === 'CHECKING' || result.code === 'BUSY') {
            // result not known yet: not a failure; the date stays so the next run looks again
            await sql`update subscriptions set processing_at = null where id = ${sub.id}`;
            return { id, outcome: 'checking', detail: result.message };
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
