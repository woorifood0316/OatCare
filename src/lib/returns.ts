import { getSql } from './db';
import type { Order } from './orders';
import type { ReturnKind, ReturnLine, ReturnReason, ReturnRequest, ReturnStatus } from './return-rules';

export * from './return-rules';

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

function mapReturn(r: Record<string, unknown>): ReturnRequest {
    return {
        id: r.id as string,
        orderId: r.order_id as string,
        orderNo: (r.order_no as string) ?? '',
        userId: (r.user_id as string | null) ?? null,
        type: r.type as ReturnKind,
        reason: r.reason as ReturnReason,
        detail: (r.detail as string) ?? '',
        items: (r.items as ReturnLine[]) ?? [],
        photos: (r.photos as string[]) ?? [],
        returnFee: (r.return_fee as number) ?? 0,
        refundEstimate: (r.refund_estimate as number) ?? 0,
        refundAmount: (r.refund_amount as number | null) ?? null,
        status: r.status as ReturnStatus,
        adminNote: (r.admin_note as string | null) ?? null,
        rejectReason: (r.reject_reason as string | null) ?? null,
        createdAt: iso(r.created_at) as string,
        completedAt: iso(r.completed_at),
    };
}

export async function listReturnsForOrder(orderId: string): Promise<ReturnRequest[]> {
    const rows = await getSql()`
        select r.*, o.order_no from return_requests r join orders o on o.id = r.order_id
        where r.order_id = ${orderId} order by r.created_at desc
    `;
    return rows.map(mapReturn);
}

/** All of a member's requests (마이페이지 교환·반품 내역 and the badges on the order list), newest first. */
export async function listMyReturns(userId: string): Promise<ReturnRequest[]> {
    const rows = await getSql()`
        select r.*, o.order_no from return_requests r join orders o on o.id = r.order_id
        where o.user_id = ${userId} order by r.created_at desc limit 200
    `;
    return rows.map(mapReturn);
}

export async function refundedSoFar(orderId: string): Promise<number> {
    const rows = await getSql()`select coalesce(sum(refund_amount), 0)::int as s from return_requests where order_id = ${orderId} and status = 'completed'`;
    return (rows[0]?.s as number) ?? 0;
}

export async function getReturn(id: string, userId?: string): Promise<ReturnRequest | null> {
    const sql = getSql();
    const rows = userId
        ? await sql`select r.*, o.order_no from return_requests r join orders o on o.id = r.order_id where r.id = ${id} and r.user_id = ${userId}`
        : await sql`select r.*, o.order_no from return_requests r join orders o on o.id = r.order_id where r.id = ${id}`;
    return rows[0] ? mapReturn(rows[0]) : null;
}

export async function insertReturn(input: {
    order: Order;
    userId: string;
    type: ReturnKind;
    reason: ReturnReason;
    detail: string;
    items: ReturnLine[];
    photos: string[];
    fee: number;
    refund: number;
}): Promise<ReturnRequest> {
    const rows = await getSql()`
        insert into return_requests (order_id, user_id, type, reason, detail, items, photos, return_fee, refund_estimate)
        values (${input.order.id}, ${input.userId}, ${input.type}, ${input.reason}, ${input.detail},
                ${JSON.stringify(input.items)}::jsonb, ${JSON.stringify(input.photos)}::jsonb, ${input.fee}, ${input.refund})
        returning *, ${input.order.orderNo}::text as order_no
    `;
    return mapReturn(rows[0]);
}

export async function adminListReturns(status: ReturnStatus | 'open' | 'all' = 'open'): Promise<(ReturnRequest & { buyer: string | null })[]> {
    const sql = getSql();
    const rows =
        status === 'all'
            ? await sql`select r.*, o.order_no, u.name as buyer from return_requests r join orders o on o.id = r.order_id
                        left join users u on u.id = r.user_id order by r.created_at desc limit 200`
            : status === 'open'
              ? await sql`select r.*, o.order_no, u.name as buyer from return_requests r join orders o on o.id = r.order_id
                          left join users u on u.id = r.user_id where r.status in ('requested', 'approved') order by r.created_at asc limit 200`
              : await sql`select r.*, o.order_no, u.name as buyer from return_requests r join orders o on o.id = r.order_id
                          left join users u on u.id = r.user_id where r.status = ${status} order by r.created_at desc limit 200`;
    return rows.map((r) => ({ ...mapReturn(r), buyer: (r.buyer as string | null) ?? null }));
}

export async function countOpenReturns(): Promise<number> {
    try {
        const rows = await getSql()`select count(*)::int as n from return_requests where status in ('requested', 'approved')`;
        return (rows[0]?.n as number) ?? 0;
    } catch {
        return 0;
    }
}
