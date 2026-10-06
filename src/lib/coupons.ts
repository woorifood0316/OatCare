import { getSql } from './db';
import {
    WELCOME_COUPON_AMOUNT,
    WELCOME_COUPON_DAYS,
    WELCOME_COUPON_MIN_ORDER,
    WELCOME_COUPON_NAME,
} from './catalog';

export interface Coupon {
    id: string;
    name: string;
    amount: number;
    minOrder: number;
    expiresAt: string;
    usedAt: string | null;
    /** Usable right now (not used, not expired, not held by an order that is still being paid). */
    available: boolean;
}

// A coupon is held by an order from checkout until that order is paid. If the order fails, is cancelled or
// is abandoned for 30 minutes, the coupon is usable again without any cleanup job.
const AVAILABLE_SQL = `(c.used_at is null and c.expires_at > now() and (
    c.order_id is null or exists (
        select 1 from orders o where o.id = c.order_id and (
            o.status in ('failed', 'canceled') or (o.status = 'pending' and o.created_at < now() - interval '30 minutes')
        )
    )
))`;

function mapCoupon(r: Record<string, unknown>): Coupon {
    return {
        id: r.id as string,
        name: r.name as string,
        amount: r.amount as number,
        minOrder: r.min_order as number,
        expiresAt: new Date(r.expires_at as string).toISOString(),
        usedAt: r.used_at ? new Date(r.used_at as string).toISOString() : null,
        available: Boolean(r.available),
    };
}

export async function listCoupons(userId: string): Promise<Coupon[]> {
    const rows = await getSql().query(
        `select c.*, ${AVAILABLE_SQL} as available from coupons c where c.user_id = $1
         order by available desc, c.expires_at asc`,
        [userId],
    );
    return (rows as Record<string, unknown>[]).map(mapCoupon);
}

export async function getAvailableCoupon(userId: string, couponId: string): Promise<Coupon | null> {
    const rows = await getSql().query(
        `select c.*, ${AVAILABLE_SQL} as available from coupons c where c.user_id = $1 and c.id = $2`,
        [userId, couponId],
    );
    const c = (rows as Record<string, unknown>[])[0];
    return c && c.available ? mapCoupon(c) : null;
}

/** One welcome coupon per member (a unique index backs this up). Never throws. */
export async function issueWelcomeCoupon(userId: string): Promise<void> {
    try {
        await getSql()`
            insert into coupons (user_id, source, name, amount, min_order, expires_at)
            values (${userId}, 'welcome', ${WELCOME_COUPON_NAME}, ${WELCOME_COUPON_AMOUNT}, ${WELCOME_COUPON_MIN_ORDER},
                    now() + (${WELCOME_COUPON_DAYS} || ' days')::interval)
            on conflict do nothing
        `;
    } catch (e) {
        console.error('[coupon] welcome coupon failed', e);
    }
}

/** Hold the coupon for this order. Returns false if someone else holds it or it is no longer usable. */
export async function reserveCoupon(userId: string, couponId: string, orderId: string): Promise<boolean> {
    const rows = await getSql().query(
        `update coupons c set order_id = $3
         where c.user_id = $1 and c.id = $2 and ${AVAILABLE_SQL} returning c.id`,
        [userId, couponId, orderId],
    );
    return (rows as unknown[]).length > 0;
}

export async function markCouponUsed(orderId: string): Promise<void> {
    await getSql()`update coupons set used_at = now() where order_id = ${orderId} and used_at is null`;
}

/** Give the coupon back when its order is cancelled/refunded (only if it has not expired meanwhile). */
export async function restoreCouponForOrder(orderId: string): Promise<void> {
    await getSql()`update coupons set used_at = null, order_id = null where order_id = ${orderId} and expires_at > now()`;
}
