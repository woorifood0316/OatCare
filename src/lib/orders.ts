import { getSql } from './db';
import { sanitizeLines, type CartLine, type PricedItem } from './catalog';
import type { OrderStatus } from './order-status';

export interface Order {
    id: string;
    orderNo: string;
    userId: string | null;
    kind: 'once' | 'subscription';
    subscriptionId: string | null;
    status: OrderStatus;
    items: PricedItem[];
    subtotal: number;
    shippingFee: number;
    amount: number;
    discountAmount: number;
    couponId: string | null;
    shipName: string | null;
    shipPhone: string | null;
    shipZip: string | null;
    shipAddress1: string | null;
    shipAddress2: string | null;
    shipMemo: string | null;
    paymentKey: string | null;
    keyType: 'widget' | 'api' | null;
    paymentLabel: string | null;
    paidAt: string | null;
    carrier: string | null;
    trackingNo: string | null;
    shippedAt: string | null;
    canceledAt: string | null;
    cancelReason: string | null;
    failReason: string | null;
    createdAt: string;
}

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

export function mapOrder(r: Record<string, unknown>): Order {
    return {
        id: r.id as string,
        orderNo: r.order_no as string,
        userId: (r.user_id as string | null) ?? null,
        kind: r.kind as Order['kind'],
        subscriptionId: (r.subscription_id as string | null) ?? null,
        status: r.status as OrderStatus,
        items: (r.items as PricedItem[]) ?? [],
        subtotal: r.subtotal as number,
        shippingFee: r.shipping_fee as number,
        amount: r.amount as number,
        discountAmount: (r.discount_amount as number) ?? 0,
        couponId: (r.coupon_id as string | null) ?? null,
        shipName: (r.ship_name as string | null) ?? null,
        shipPhone: (r.ship_phone as string | null) ?? null,
        shipZip: (r.ship_zip as string | null) ?? null,
        shipAddress1: (r.ship_address1 as string | null) ?? null,
        shipAddress2: (r.ship_address2 as string | null) ?? null,
        shipMemo: (r.ship_memo as string | null) ?? null,
        paymentKey: (r.payment_key as string | null) ?? null,
        keyType: (r.key_type as Order['keyType']) ?? null,
        paymentLabel: (r.payment_label as string | null) ?? null,
        paidAt: iso(r.paid_at),
        carrier: (r.carrier as string | null) ?? null,
        trackingNo: (r.tracking_no as string | null) ?? null,
        shippedAt: iso(r.shipped_at),
        canceledAt: iso(r.canceled_at),
        cancelReason: (r.cancel_reason as string | null) ?? null,
        failReason: (r.fail_reason as string | null) ?? null,
        createdAt: iso(r.created_at) as string,
    };
}

/** Toss orderId: 6-64 chars of [A-Za-z0-9-_=]. Example: OC20261006-K3J9QZ2M */
export function newOrderNo(): string {
    const d = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const rand = Array.from(bytes, (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
    return `OC${d}-${rand}`;
}

/** Customer-visible orders (abandoned/never-paid checkouts are hidden unless they failed). */
export async function listOrders(userId: string): Promise<Order[]> {
    const rows = await getSql()`
        select * from orders where user_id = ${userId} and status <> 'pending'
        order by created_at desc limit 100
    `;
    return rows.map(mapOrder);
}

export async function getOrderByNo(orderNo: string, userId?: string): Promise<Order | null> {
    const sql = getSql();
    const rows = userId
        ? await sql`select * from orders where order_no = ${orderNo} and user_id = ${userId}`
        : await sql`select * from orders where order_no = ${orderNo}`;
    return rows[0] ? mapOrder(rows[0]) : null;
}

export async function getOrCreateCustomerKey(userId: string): Promise<string> {
    const sql = getSql();
    const rows = await sql`select toss_customer_key from users where id = ${userId}`;
    const existing = rows[0]?.toss_customer_key as string | null | undefined;
    if (existing) return existing;
    const key = `oc-${crypto.randomUUID()}`;
    await sql`update users set toss_customer_key = ${key} where id = ${userId} and toss_customer_key is null`;
    const again = await sql`select toss_customer_key from users where id = ${userId}`;
    return again[0].toss_customer_key as string;
}

/** Remove already-purchased lines from the server cart. */
export async function clearCartMode(userId: string, mode: 'once' | 'subscribe'): Promise<void> {
    await getSql()`
        update carts set updated_at = now(), lines = coalesce(
            (select jsonb_agg(l) from jsonb_array_elements(lines) l where l->>'mode' <> ${mode}),
            '[]'::jsonb
        )
        where user_id = ${userId}
    `;
}

/** Remove specific lines from the server cart (e.g. the subscription groups that were just purchased). */
export async function removeCartLines(userId: string, shouldRemove: (line: CartLine) => boolean): Promise<void> {
    const sql = getSql();
    const rows = await sql`select lines from carts where user_id = ${userId}`;
    if (!rows[0]) return;
    const kept = sanitizeLines(rows[0].lines).filter((l) => !shouldRemove(l));
    await sql`update carts set lines = ${JSON.stringify(kept)}::jsonb, updated_at = now() where user_id = ${userId}`;
}
