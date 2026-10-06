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
    status?: string;
    kind?: string;
    q?: string;
    page?: number;
}

export async function searchOrders(f: OrderFilter): Promise<{ orders: Order[]; total: number; page: number }> {
    const sql = getSql();
    const where: string[] = [`status <> 'pending'`];
    const params: unknown[] = [];
    const add = (cond: string, value: unknown) => {
        params.push(value);
        where.push(cond.replace('?', `$${params.length}`));
    };
    if (f.status && f.status !== 'all') add('status = ?', f.status);
    if (f.kind === 'once' || f.kind === 'subscription') add('kind = ?', f.kind);
    if (f.q) {
        params.push(`%${f.q.trim()}%`);
        const i = params.length;
        where.push(`(order_no ilike $${i} or ship_name ilike $${i} or ship_phone ilike $${i} or tracking_no ilike $${i})`);
    }
    const page = Math.max(1, f.page ?? 1);
    const clause = where.join(' and ');
    const total = ((await sql.query(`select count(*)::int n from orders where ${clause}`, params)) as { n: number }[])[0].n;
    const rows = (await sql.query(
        `select * from orders where ${clause} order by created_at desc limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
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
