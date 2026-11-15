import { getSql } from './db';
import {
    COUPON_PENDING_DAYS,
    COUPON_VALID_DAYS,
    WELCOME_BONUS_COUPON_NAME,
    WELCOME_COUPON_AMOUNT,
    WELCOME_COUPON_BASE,
    WELCOME_COUPON_BONUS,
    WELCOME_COUPON_DAYS,
    WELCOME_COUPON_MIN_COUNT,
    WELCOME_COUPON_NAME,
} from './catalog';

export interface Coupon {
    id: string;
    name: string;
    amount: number;
    /** Minimum sachets for single / taster-set orders (DB column min_order). */
    minCount: number;
    expiresAt: string;
    usedAt: string | null;
    /** 'welcome' | 'welcome_bonus' | 'review' | 'referral' */
    source: string;
    /** Waiting for the event/benefit notification consent (받을 준비 중); expiresAt is then the end of the wait. */
    pending: boolean;
    /** Usable right now (not used, not expired, not held by an order that is still being paid). */
    available: boolean;
}

// A coupon is held by an order from checkout until that order is paid. If the order fails, is cancelled or
// is abandoned for 30 minutes, the coupon is usable again without any cleanup job.
const AVAILABLE_SQL = `(not c.pending and c.used_at is null and c.expires_at > now() and (
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
        minCount: r.min_order as number,
        expiresAt: new Date(r.expires_at as string).toISOString(),
        usedAt: r.used_at ? new Date(r.used_at as string).toISOString() : null,
        source: (r.source as string) ?? '',
        pending: Boolean(r.pending),
        available: Boolean(r.available),
    };
}

/** The member's coupons, waiting ones included (a waiting coupon whose 30 days ran out is not listed). */
export async function listCoupons(userId: string): Promise<Coupon[]> {
    const rows = await getSql().query(
        `select c.*, ${AVAILABLE_SQL} as available from coupons c where c.user_id = $1 and (not c.pending or c.expires_at > now())
         order by available desc, c.pending asc, c.expires_at asc`,
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

/** One welcome coupon per member (a unique index backs this up): 1,000원, raised to 3,000원 by the notification consent. Never throws. */
export async function issueWelcomeCoupon(userId: string): Promise<void> {
    try {
        await getSql()`
            insert into coupons (user_id, source, name, amount, min_order, expires_at)
            values (${userId}, 'welcome', ${WELCOME_COUPON_NAME}, ${WELCOME_COUPON_BASE}, ${WELCOME_COUPON_MIN_COUNT},
                    now() + (${WELCOME_COUPON_DAYS} || ' days')::interval)
            on conflict do nothing
        `;
    } catch (e) {
        console.error('[coupon] welcome coupon failed', e);
    }
}

/**
 * A review-event / friend-invitation coupon. With the notification consent it is issued at once; without it, it waits
 * (pending) for COUPON_PENDING_DAYS and is issued the moment the member turns the notifications on.
 */
export async function issueRewardCoupon(
    userId: string,
    source: 'review' | 'referral',
    name: string,
    amount: number,
): Promise<{ id: string; pending: boolean }> {
    const sql = getSql();
    const u = await sql`select marketing_agreed from users where id = ${userId}`;
    const pending = !u[0]?.marketing_agreed;
    const days = pending ? COUPON_PENDING_DAYS : COUPON_VALID_DAYS;
    const rows = await sql`
        insert into coupons (user_id, source, name, amount, min_order, expires_at, pending, pending_until)
        values (${userId}, ${source}, ${name}, ${amount}, ${WELCOME_COUPON_MIN_COUNT}, now() + (${days} || ' days')::interval,
                ${pending}, case when ${pending} then now() + (${days} || ' days')::interval end)
        returning id
    `;
    return { id: rows[0].id as string, pending };
}

export interface ConsentGain {
    /** Waiting coupons that turning the notifications on issues. */
    pendingIds: string[];
    /** The (unused) welcome coupon that becomes 3,000원, or null. */
    welcomeUpgradeId: string | null;
    /** The welcome coupon was used already: a separate 2,000원 coupon is issued instead. */
    welcomeBonusNew: boolean;
}

/** What turning the notifications on would give this member right now (checkout / coupon box preview). */
export async function consentGain(userId: string): Promise<ConsentGain> {
    const none: ConsentGain = { pendingIds: [], welcomeUpgradeId: null, welcomeBonusNew: false };
    const sql = getSql();
    const u = await sql`select marketing_agreed, welcome_bonus_at from users where id = ${userId}`;
    if (!u[0] || u[0].marketing_agreed) return none;
    const pend = await sql`select id from coupons where user_id = ${userId} and pending and expires_at > now()`;
    const gain: ConsentGain = { ...none, pendingIds: pend.map((r) => r.id as string) };
    if (u[0].welcome_bonus_at) return gain;
    const w = await sql`select id, amount, used_at, order_id, expires_at from coupons where user_id = ${userId} and source = 'welcome'`;
    // Members from before the split already hold a 3,000원 coupon: nothing to add.
    if (!w[0] || (w[0].amount as number) >= WELCOME_COUPON_AMOUNT) return gain;
    if (!w[0].used_at && !w[0].order_id && new Date(w[0].expires_at as string) > new Date()) gain.welcomeUpgradeId = w[0].id as string;
    else gain.welcomeBonusNew = true;
    return gain;
}

/**
 * The member turned the notifications on: issue the waiting coupons and raise the welcome coupon to 3,000원
 * (or add a 2,000원 coupon when it was used already). The welcome raise happens once per member, ever.
 * Returns the id of the separate bonus coupon when one was created.
 */
export async function grantConsentRewards(userId: string): Promise<{ bonusCouponId: string | null }> {
    const sql = getSql();
    await sql`
        update coupons set pending = false, pending_until = null, expires_at = now() + (${COUPON_VALID_DAYS} || ' days')::interval
        where user_id = ${userId} and pending and expires_at > now()
    `;
    const w = await sql`select id, amount from coupons where user_id = ${userId} and source = 'welcome'`;
    if (!w[0] || (w[0].amount as number) >= WELCOME_COUPON_AMOUNT) return { bonusCouponId: null };
    const claimed = await sql`update users set welcome_bonus_at = now() where id = ${userId} and welcome_bonus_at is null returning id`;
    if (claimed.length === 0) return { bonusCouponId: null };
    const raised = await sql`
        update coupons set amount = ${WELCOME_COUPON_AMOUNT}
        where id = ${w[0].id} and used_at is null and order_id is null and expires_at > now() returning id
    `;
    if (raised.length > 0) return { bonusCouponId: null };
    const bonus = await sql`
        insert into coupons (user_id, source, name, amount, min_order, expires_at)
        values (${userId}, 'welcome_bonus', ${WELCOME_BONUS_COUPON_NAME}, ${WELCOME_COUPON_BONUS}, ${WELCOME_COUPON_MIN_COUNT},
                now() + (${COUPON_VALID_DAYS} || ' days')::interval)
        on conflict do nothing returning id
    `;
    return { bonusCouponId: (bonus[0]?.id as string) ?? null };
}

/** Sign-up coupons go once per delivery address / phone: true when another member already used one for this address or phone. */
export async function welcomeUsedElsewhere(userId: string, phone: string, address1: string, address2: string | null): Promise<boolean> {
    const digits = phone.replace(/\D/g, '');
    const place = `${address1}${address2 ?? ''}`.replace(/\s/g, '').toLowerCase();
    const rows = await getSql()`
        select 1 from orders o join coupons c on c.id = o.coupon_id
        where o.user_id <> ${userId} and c.source in ('welcome', 'welcome_bonus') and c.used_at is not null
          and o.status in ('paid', 'preparing', 'shipped', 'delivered')
          and ((${digits} <> '' and regexp_replace(coalesce(o.ship_phone, ''), '[^0-9]', '', 'g') = ${digits})
               or lower(regexp_replace(coalesce(o.ship_address1, '') || coalesce(o.ship_address2, ''), '[[:space:]]', '', 'g')) = ${place})
        limit 1
    `;
    return rows.length > 0;
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
