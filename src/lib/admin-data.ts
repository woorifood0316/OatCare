import { getSql } from './db';
import { mapOrder, type Order } from './orders';
import { mapSubscription } from './subscriptions';
import type { Subscription } from './subscription-types';
import { todayKst } from './dates';

export const PAGE_SIZE = 30;

export async function dashboardStats() {
    const sql = getSql();
    const today = todayKst();
    const month = today.slice(0, 7);
    const counted = `('paid','preparing','shipped','delivered')`;
    const [t, m, ship, subs, due, failed, pending, recent, trouble] = await Promise.all([
        sql.query(
            `select count(*)::int n, coalesce(sum(amount),0)::int sum from orders
             where status in ${counted} and (paid_at at time zone 'Asia/Seoul')::date = $1::date`,
            [today],
        ),
        sql.query(
            `select coalesce(sum(amount),0)::int sum from orders
             where status in ${counted} and to_char(paid_at at time zone 'Asia/Seoul', 'YYYY-MM') = $1`,
            [month],
        ),
        sql`select count(*)::int n from orders where status in ('paid','preparing')`,
        sql`select count(*)::int n from subscriptions where status = 'active'`,
        sql`select count(*)::int n from subscriptions where status = 'active' and next_billing_date <= ${today}`,
        sql`select count(*)::int n from billing_attempts where ok = false and attempted_at > now() - interval '7 days'`,
        sql`select count(*)::int n from notifications where status = 'pending'`,
        sql`select * from orders where status <> 'pending' order by created_at desc limit 8`,
        sql`select * from subscriptions where status = 'past_due' or (status = 'active' and fail_count > 0) order by updated_at desc limit 8`,
    ]);
    return {
        todayOrders: (t as { n: number; sum: number }[])[0].n,
        todaySales: (t as { n: number; sum: number }[])[0].sum,
        monthSales: (m as { sum: number }[])[0].sum,
        needsShipping: ship[0].n as number,
        activeSubs: subs[0].n as number,
        dueToday: due[0].n as number,
        failedCharges7d: failed[0].n as number,
        pendingNotifications: pending[0].n as number,
        recentOrders: recent.map(mapOrder),
        troubleSubs: trouble.map(mapSubscription),
    };
}

export interface OrderFilter {
    /** One status or several separated by commas ("paid,preparing"). */
    status?: string;
    kind?: string;
    q?: string;
    /** Column filters */
    no?: string; // order number contains
    name?: string; // recipient contains
    from?: string; // YYYY-MM-DD (KST, payment date or order date)
    to?: string;
    product?: string; // sku contained in the order
    min?: string; // amount range
    max?: string;
    tn?: string; // tracking: 'yes' (has a waybill) | 'no' (not yet)
    track?: string; // waybill number contains
    sort?: string;
    dir?: string;
    page?: number;
}

export const ORDER_SORTS = {
    no: 'order_no',
    date: 'coalesce(paid_at, created_at)',
    name: 'ship_name',
    product: "(items->0->>'name')",
    kind: 'kind',
    status: 'status',
    amount: 'amount',
    qty: 'qty_total',
    tracking: 'tracking_no',
} as const;

/** Sachets in an order (sets count as their size, the free gift line not at all). */
const QTY_SQL = `(select coalesce(sum((i->>'qty')::int * coalesce((i->>'count')::int, 1)), 0)
    from jsonb_array_elements(items) i where coalesce((i->>'gift')::boolean, false) = false)`;
export type OrderSortKey = keyof typeof ORDER_SORTS;

const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const intOf = (v?: string) => (v && /^\d{1,9}$/.test(v.replace(/,/g, '')) ? Number(v.replace(/,/g, '')) : null);
export const statusList = (v?: string) =>
    (v ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter((x) => /^(paid|preparing|shipped|delivered|canceled|failed)$/.test(x));

/**
 * WHERE clause shared by the orders list and the Excel export (same filters → same rows).
 * `defaultStatuses` applies when no status filter is set.
 */
export function orderWhere(f: OrderFilter, defaultStatuses?: string[]): { clause: string; params: unknown[] } {
    const where: string[] = [`status <> 'pending'`];
    const params: unknown[] = [];
    const add = (cond: string, value: unknown) => {
        params.push(value);
        where.push(cond.replaceAll('?', `$${params.length}`));
    };
    const statuses = statusList(f.status);
    if (statuses.length) add('status = any(?)', statuses);
    else if (defaultStatuses?.length) add('status = any(?)', defaultStatuses);
    if (f.kind === 'once' || f.kind === 'subscription') add('kind = ?', f.kind);
    if (f.q?.trim()) add('(order_no ilike ? or ship_name ilike ? or ship_phone ilike ? or tracking_no ilike ?)', `%${f.q.trim()}%`);
    if (f.no?.trim()) add('order_no ilike ?', `%${f.no.trim()}%`);
    if (f.name?.trim()) add('ship_name ilike ?', `%${f.name.trim()}%`);
    if (isDay(f.from)) add(`coalesce(paid_at, created_at) >= (?::date)::timestamp at time zone 'Asia/Seoul'`, f.from);
    if (isDay(f.to)) add(`coalesce(paid_at, created_at) < ((?::date) + 1)::timestamp at time zone 'Asia/Seoul'`, f.to);
    if (f.product && /^[\w:가-힣]+$/.test(f.product)) add('items @> ?::jsonb', JSON.stringify([{ sku: f.product }]));
    const min = intOf(f.min);
    const max = intOf(f.max);
    if (min !== null) add('amount >= ?', min);
    if (max !== null) add('amount <= ?', max);
    if (f.tn === 'yes') where.push(`coalesce(tracking_no, '') <> ''`);
    if (f.tn === 'no') where.push(`coalesce(tracking_no, '') = ''`);
    if (f.track?.trim()) add('tracking_no ilike ?', `%${f.track.trim().replace(/[^0-9A-Za-z]/g, '')}%`);
    return { clause: where.join(' and '), params };
}

export function orderBy(f: OrderFilter, fallback = 'created_at desc'): string {
    const key = f.sort as OrderSortKey;
    const col = ORDER_SORTS[key];
    if (!col) return fallback;
    return `${key === 'qty' ? QTY_SQL : col} ${f.dir === 'asc' ? 'asc' : 'desc'} nulls last, created_at desc`;
}

export async function searchOrders(f: OrderFilter): Promise<{ orders: Order[]; total: number; page: number }> {
    const sql = getSql();
    const { clause, params } = orderWhere(f);
    const page = Math.max(1, f.page ?? 1);
    const total = ((await sql.query(`select count(*)::int n from orders where ${clause}`, params)) as { n: number }[])[0].n;
    const rows = (await sql.query(
        `select * from orders where ${clause} order by ${orderBy(f)} limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
        params,
    )) as Record<string, unknown>[];
    return { orders: rows.map(mapOrder), total, page };
}

export interface AdminSub extends Subscription {
    userName: string | null;
    userEmail: string | null;
    attempts: { ok: boolean; errorCode: string | null; errorMessage: string | null; at: string }[];
}

export async function searchSubscriptions(status?: string): Promise<AdminSub[]> {
    const sql = getSql();
    const rows =
        status && status !== 'all'
            ? await sql`select s.*, u.name as user_name, u.email as user_email from subscriptions s
                        left join users u on u.id = s.user_id where s.status = ${status}
                        order by s.next_billing_date asc limit 100`
            : await sql`select s.*, u.name as user_name, u.email as user_email from subscriptions s
                        left join users u on u.id = s.user_id
                        order by (s.status = 'canceled'), s.next_billing_date asc limit 100`;
    const ids = rows.map((r) => r.id as string);
    const attempts = ids.length
        ? await sql`select subscription_id, ok, error_code, error_message, attempted_at from billing_attempts
                    where subscription_id = any(${ids}::uuid[]) order by attempted_at desc limit 300`
        : [];
    return rows.map((r) => ({
        ...mapSubscription(r),
        userName: (r.user_name as string | null) ?? null,
        userEmail: (r.user_email as string | null) ?? null,
        attempts: attempts
            .filter((a) => a.subscription_id === r.id)
            .slice(0, 5)
            .map((a) => ({
                ok: Boolean(a.ok),
                errorCode: (a.error_code as string | null) ?? null,
                errorMessage: (a.error_message as string | null) ?? null,
                at: new Date(a.attempted_at as string).toISOString(),
            })),
    }));
}

export interface MemberRow {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    providers: string[];
    createdAt: string;
    marketingAgreed: boolean;
    orderCount: number;
    activeSubs: number;
}

export async function searchMembers(q?: string): Promise<MemberRow[]> {
    const sql = getSql();
    const like = q ? `%${q.trim()}%` : null;
    const rows = await sql`
        select u.id, u.name, u.email, u.role, u.created_at, u.marketing_agreed,
            (select array_agg(a.provider) from accounts a where a.user_id = u.id) as providers,
            (select count(*)::int from orders o where o.user_id = u.id and o.status <> 'pending') as order_count,
            (select count(*)::int from subscriptions s where s.user_id = u.id and s.status = 'active') as active_subs
        from users u
        where (${like}::text is null or u.name ilike ${like} or u.email ilike ${like})
        order by u.created_at desc limit 100
    `;
    return rows.map((r) => ({
        id: r.id as string,
        name: (r.name as string | null) ?? null,
        email: (r.email as string | null) ?? null,
        role: r.role as string,
        providers: ((r.providers as string[] | null) ?? []).filter(Boolean),
        createdAt: new Date(r.created_at as string).toISOString(),
        marketingAgreed: Boolean(r.marketing_agreed),
        orderCount: r.order_count as number,
        activeSubs: r.active_subs as number,
    }));
}

export interface NotificationRow {
    id: string;
    channel: string;
    event: string;
    status: string;
    attempts: number;
    error: string | null;
    createdAt: string;
    sentAt: string | null;
    userName: string | null;
}

export async function recentNotifications(): Promise<NotificationRow[]> {
    const rows = await getSql()`
        select n.*, u.name as user_name from notifications n left join users u on u.id = n.user_id
        order by n.created_at desc limit 100
    `;
    return rows.map((r) => ({
        id: r.id as string,
        channel: r.channel as string,
        event: r.event as string,
        status: r.status as string,
        attempts: r.attempts as number,
        error: (r.error as string | null) ?? null,
        createdAt: new Date(r.created_at as string).toISOString(),
        sentAt: r.sent_at ? new Date(r.sent_at as string).toISOString() : null,
        userName: (r.user_name as string | null) ?? null,
    }));
}

/** Which notification channels are wired up (never exposes the secrets themselves). */
export function channelConfig() {
    return {
        adminWebhook: Boolean(process.env.ADMIN_WEBHOOK_URL),
        telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
        email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    };
}
