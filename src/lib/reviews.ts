import { getSql } from './db';
import { issueRewardCoupon } from './coupons';
import {
    REVIEW_COUPON_NAME,
    REVIEW_REWARD_PHOTO,
    REVIEW_REWARD_TEXT,
    REVIEW_STRIKE_LIMIT,
    getItem,
} from './catalog';

export interface PublicReview {
    id: string;
    sku: string;
    rating: number;
    body: string;
    photos: string[];
    authorName: string;
    eventJoined: boolean;
    rewardAmount: number;
    createdAt: string;
    /** 'subscription' reviews come from a subscriber. */
    kind: 'once' | 'subscription';
}

export interface ReviewStats {
    count: number;
    average: number;
    /** count per star, index 0 = 1 star */
    stars: number[];
}

/** Something the member bought that can still be reviewed. */
export interface Reviewable {
    key: string; // "o:<orderNo>:<sku>" or "s:<subscriptionId>"
    sku: string;
    name: string;
    orderNo: string;
    subscriptionId: string | null;
    shippedAt: string | null;
}

function mapReview(r: Record<string, unknown>): PublicReview {
    return {
        id: r.id as string,
        sku: r.sku as string,
        rating: r.rating as number,
        body: r.body as string,
        photos: Array.isArray(r.photos) ? (r.photos as string[]) : [],
        authorName: r.author_name as string,
        eventJoined: Boolean(r.event_joined),
        rewardAmount: (r.reward_amount as number) ?? 0,
        createdAt: new Date(r.created_at as string).toISOString(),
        kind: r.subscription_id ? 'subscription' : 'once',
    };
}

/** Visible reviews of one product (sku), newest first, plus star statistics. */
export async function listProductReviews(sku: string, limit = 50): Promise<{ reviews: PublicReview[]; stats: ReviewStats }> {
    const sql = getSql();
    const [rows, agg] = await Promise.all([
        sql`select * from reviews where sku = ${sku} and status = 'visible' order by created_at desc limit ${limit}`,
        sql`select rating, count(*)::int n from reviews where sku = ${sku} and status = 'visible' group by rating`,
    ]);
    const stars = [0, 0, 0, 0, 0];
    for (const r of agg) stars[(r.rating as number) - 1] = r.n as number;
    const count = stars.reduce((a, b) => a + b, 0);
    const average = count ? Math.round((stars.reduce((a, n, i) => a + n * (i + 1), 0) / count) * 10) / 10 : 0;
    return { reviews: rows.map(mapReview), stats: { count, average, stars } };
}

/** Items of shipped orders (and subscriptions with a shipped delivery) the member has not reviewed yet. */
export async function listReviewables(userId: string): Promise<Reviewable[]> {
    const sql = getSql();
    const orders = await sql`
        select o.id, o.order_no, o.kind, o.subscription_id, o.items, o.shipped_at, o.created_at
        from orders o
        where o.user_id = ${userId} and o.status in ('shipped', 'delivered')
        order by o.created_at desc
    `;
    const written = await sql`select order_id, subscription_id, sku from reviews where user_id = ${userId}`;
    const doneItems = new Set(written.filter((w) => !w.subscription_id).map((w) => `${w.order_id}:${w.sku}`));
    const doneSubs = new Set(written.filter((w) => w.subscription_id).map((w) => w.subscription_id as string));

    const out: Reviewable[] = [];
    const seenSubs = new Set<string>();
    for (const o of orders) {
        const items = (Array.isArray(o.items) ? o.items : []) as { sku: string; name?: string; gift?: boolean }[];
        const real = items.filter((i) => !i.gift && getItem(i.sku));
        if (o.kind === 'subscription' && o.subscription_id) {
            const subId = o.subscription_id as string;
            if (doneSubs.has(subId) || seenSubs.has(subId) || real.length === 0) continue;
            seenSubs.add(subId);
            out.push({
                key: `s:${subId}`,
                sku: real[0].sku,
                name: `${getItem(real[0].sku)!.name} (정기구독)`,
                orderNo: o.order_no as string,
                subscriptionId: subId,
                shippedAt: o.shipped_at ? new Date(o.shipped_at as string).toISOString() : null,
            });
            continue;
        }
        const seenSku = new Set<string>();
        for (const it of real) {
            if (seenSku.has(it.sku) || doneItems.has(`${o.id}:${it.sku}`)) continue;
            seenSku.add(it.sku);
            out.push({
                key: `o:${o.order_no}:${it.sku}`,
                sku: it.sku,
                name: getItem(it.sku)!.name,
                orderNo: o.order_no as string,
                subscriptionId: null,
                shippedAt: o.shipped_at ? new Date(o.shipped_at as string).toISOString() : null,
            });
        }
    }
    return out;
}

/** The member's own reviews (including ones the operator deleted, with the reason). */
export async function listMyReviews(userId: string) {
    const rows = await getSql()`select * from reviews where user_id = ${userId} order by created_at desc`;
    return rows.map((r) => ({
        ...mapReview(r),
        status: r.status as 'visible' | 'deleted',
        deletedCategory: (r.deleted_category as string | null) ?? null,
        deletedReason: (r.deleted_reason as string | null) ?? null,
    }));
}

export async function reviewStanding(userId: string): Promise<{ strikes: number; banned: boolean }> {
    const rows = await getSql()`select review_strikes, review_banned_at from users where id = ${userId}`;
    const r = rows[0];
    return { strikes: (r?.review_strikes as number) ?? 0, banned: Boolean(r?.review_banned_at) };
}

export function rewardFor(photoCount: number): number {
    return photoCount > 0 ? REVIEW_REWARD_PHOTO : REVIEW_REWARD_TEXT;
}

/**
 * Save a review for one reviewable item. Returns an error message instead of throwing for expected problems.
 * With the review event chosen, a coupon is issued right away (same rules as other coupons, valid COUPON_VALID_DAYS).
 */
export async function createReview(input: {
    userId: string;
    authorName: string;
    key: string;
    rating: number;
    body: string;
    photos: string[];
    eventJoined: boolean;
}): Promise<{ ok: true; id: string; reward: number; pending: boolean } | { ok: false; message: string }> {
    const sql = getSql();
    const target = (await listReviewables(input.userId)).find((r) => r.key === input.key);
    if (!target) return { ok: false, message: '리뷰를 쓸 수 있는 주문을 찾지 못했어요 (이미 작성했거나 아직 발송 전이에요)' };

    const order = await sql`select id from orders where order_no = ${target.orderNo} and user_id = ${input.userId}`;
    const orderId = (order[0]?.id as string) ?? null;
    const reward = input.eventJoined ? rewardFor(input.photos.length) : 0;

    let inserted;
    try {
        inserted = await sql`
            insert into reviews (user_id, order_id, subscription_id, sku, rating, body, photos, author_name, event_joined, reward_amount)
            values (${input.userId}, ${orderId}, ${target.subscriptionId}, ${target.sku}, ${input.rating}, ${input.body},
                    ${JSON.stringify(input.photos)}::jsonb, ${input.authorName}, ${input.eventJoined}, ${reward})
            returning id
        `;
    } catch {
        return { ok: false, message: '이미 리뷰를 작성한 상품이에요' };
    }
    const id = inserted[0].id as string;

    // Issued at once with the notification consent; otherwise it waits (받을 준비 중) until the member turns it on.
    let pending = false;
    if (reward > 0) {
        const coupon = await issueRewardCoupon(input.userId, 'review', REVIEW_COUPON_NAME, reward);
        pending = coupon.pending;
        await sql`update reviews set reward_coupon_id = ${coupon.id} where id = ${id}`;
    }
    return { ok: true, id, reward, pending };
}

// ---------------- operator ----------------

export interface AdminReview extends PublicReview {
    status: 'visible' | 'deleted';
    deletedCategory: string | null;
    deletedReason: string | null;
    deletedAt: string | null;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    strikes: number;
    banned: boolean;
}

export async function adminListReviews(filter: { status?: string; q?: string } = {}): Promise<AdminReview[]> {
    const sql = getSql();
    const status = filter.status === 'deleted' ? 'deleted' : filter.status === 'all' ? null : 'visible';
    const q = filter.q?.trim() ? `%${filter.q.trim()}%` : null;
    const rows = await sql`
        select r.*, u.name as user_name, u.email as user_email, coalesce(u.review_strikes, 0) as strikes, u.review_banned_at
        from reviews r left join users u on u.id = r.user_id
        where (${status}::text is null or r.status = ${status})
          and (${q}::text is null or r.body ilike ${q} or u.name ilike ${q} or u.email ilike ${q})
        order by r.created_at desc
        limit 200
    `;
    return rows.map((r) => ({
        ...mapReview(r),
        status: r.status as 'visible' | 'deleted',
        deletedCategory: (r.deleted_category as string | null) ?? null,
        deletedReason: (r.deleted_reason as string | null) ?? null,
        deletedAt: r.deleted_at ? new Date(r.deleted_at as string).toISOString() : null,
        userId: (r.user_id as string | null) ?? null,
        userName: (r.user_name as string | null) ?? null,
        userEmail: (r.user_email as string | null) ?? null,
        strikes: r.strikes as number,
        banned: Boolean(r.review_banned_at),
    }));
}

/**
 * Operator deletes a review with a reason. Profanity / personal info / ads count as a violation: the unused event coupon
 * is withdrawn, and at REVIEW_STRIKE_LIMIT the member can no longer write reviews (and becomes eligible for expulsion).
 */
export async function adminDeleteReview(id: string, category: 'profanity' | 'privacy' | 'ad' | 'other', reason: string) {
    const sql = getSql();
    const rows = await sql`
        update reviews set status = 'deleted', deleted_category = ${category}, deleted_reason = ${reason}, deleted_at = now()
        where id = ${id} and status = 'visible'
        returning user_id, reward_coupon_id
    `;
    const r = rows[0];
    if (!r) return { ok: false as const };
    const violation = category !== 'other';
    if (violation && r.reward_coupon_id) {
        // An unused event coupon is withdrawn (expired now); one already used stays used.
        await sql`update coupons set expires_at = now() where id = ${r.reward_coupon_id} and used_at is null and order_id is null`;
    }
    let strikes = 0;
    if (violation && r.user_id) {
        const u = await sql`
            update users set review_strikes = review_strikes + 1,
                review_banned_at = case when review_strikes + 1 >= ${REVIEW_STRIKE_LIMIT} then coalesce(review_banned_at, now()) else review_banned_at end
            where id = ${r.user_id} returning review_strikes
        `;
        strikes = (u[0]?.review_strikes as number) ?? 0;
    }
    return { ok: true as const, strikes };
}

/**
 * Expel a member who reached the violation limit: subscriptions stop, the account is removed (orders stay for legal
 * retention) and their social logins are blocked from signing up again.
 */
export async function adminExpelMember(userId: string): Promise<{ ok: boolean; message?: string }> {
    const sql = getSql();
    const u = await sql`select review_strikes from users where id = ${userId}`;
    if (!u[0]) return { ok: false, message: '회원을 찾을 수 없어요' };
    if ((u[0].review_strikes as number) < REVIEW_STRIKE_LIMIT) return { ok: false, message: `위반 ${REVIEW_STRIKE_LIMIT}회 이상인 회원만 제명할 수 있어요` };
    const open = await sql`select 1 from orders where user_id = ${userId} and status in ('paid', 'preparing', 'shipped') limit 1`;
    if (open.length > 0) return { ok: false, message: '처리 중인 주문(결제·준비·배송 중)이 끝난 뒤에 제명할 수 있어요' };
    await sql.transaction([
        sql`insert into banned_accounts (provider, provider_account_id, reason)
            select provider, provider_account_id, '리뷰 운영정책 위반 제명' from accounts where user_id = ${userId}
            on conflict do nothing`,
        sql`update subscriptions set status = 'canceled', canceled_at = now(), cancel_reason = '리뷰 운영정책 위반 제명'
            where user_id = ${userId} and status <> 'canceled'`,
        sql`delete from users where id = ${userId}`,
    ]);
    return { ok: true };
}

export async function isBannedAccount(provider: string, providerAccountId: string): Promise<boolean> {
    try {
        const rows = await getSql()`select 1 from banned_accounts where provider = ${provider} and provider_account_id = ${providerAccountId}`;
        return rows.length > 0;
    } catch {
        return false; // table not migrated yet
    }
}
