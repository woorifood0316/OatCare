import { getSql } from '../../../../../lib/db';
import { jsonError, requireAdmin, sameOrigin } from '../../../../../lib/api';
import { mapOrder } from '../../../../../lib/orders';
import { buildExportWorkbook } from '../../../../../lib/shipping-excel';

export const runtime = 'edge';

const MAX_ORDERS = 2000;

/** Delivery-info Excel (form A). Body: { orderNos?: string[], status?, kind?, q?, markPreparing?: boolean } */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const admin = await requireAdmin();
    if (!admin) return jsonError('Forbidden', 403);

    let body: Record<string, unknown> = {};
    try {
        body = await request.json();
    } catch {
        /* empty body = default filter */
    }

    const sql = getSql();
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (cond: string, value: unknown) => {
        params.push(value);
        where.push(cond.replace('?', `$${params.length}`));
    };

    const orderNos = Array.isArray(body.orderNos) ? body.orderNos.filter((x): x is string => typeof x === 'string').slice(0, MAX_ORDERS) : [];
    if (orderNos.length > 0) {
        // Explicit selection: any paid order, but never unpaid / failed / canceled ones.
        add('order_no = any(?)', orderNos);
        where.push(`status in ('paid','preparing','shipped','delivered')`);
    } else {
        const status = typeof body.status === 'string' && body.status !== 'all' ? body.status : '';
        if (status) add('status = ?', status);
        else where.push(`status in ('paid','preparing')`); // default: waiting to ship
        if (body.kind === 'once' || body.kind === 'subscription') add('kind = ?', body.kind);
        if (typeof body.q === 'string' && body.q.trim()) {
            params.push(`%${body.q.trim()}%`);
            const i = params.length;
            where.push(`(order_no ilike $${i} or ship_name ilike $${i} or ship_phone ilike $${i} or tracking_no ilike $${i})`);
        }
    }

    const rows = (await sql.query(
        `select * from orders where ${where.join(' and ')} order by coalesce(paid_at, created_at) asc limit ${MAX_ORDERS}`,
        params,
    )) as Record<string, unknown>[];
    if (rows.length === 0) return jsonError('내려받을 주문이 없어요', 404);
    const orders = rows.map(mapOrder);

    if (body.markPreparing === true) {
        await sql`update orders set status = 'preparing', updated_at = now()
                  where status = 'paid' and order_no = any(${orders.map((o) => o.orderNo)})`;
    }

    // Audit trail: the file holds customers' names, phone numbers and addresses.
    console.info('[admin-export]', JSON.stringify({ admin: admin.id, orders: orders.length, marked: body.markPreparing === true }));

    const kst = new Date(Date.now() + 9 * 3600 * 1000).toISOString();
    const stamp = `${kst.slice(0, 10).replace(/-/g, '')}_${kst.slice(11, 13)}${kst.slice(14, 16)}`;
    const filename = `배송정보_${stamp}.xlsx`;
    return new Response(buildExportWorkbook(orders), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="delivery_${stamp}.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
            'Cache-Control': 'no-store',
            'X-Order-Count': String(orders.length),
        },
    });
}
