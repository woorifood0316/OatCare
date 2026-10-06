import { getSql } from '../../../../lib/db';
import { isUuid, jsonError, sameOrigin, sessionUserId } from '../../../../lib/api';
import { listPaymentMethods } from '../../../../lib/payment-methods';

export const runtime = 'edge';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);
    const { id } = await ctx.params;
    if (!isUuid(id)) return jsonError('Not Found', 404);

    let body: { isDefault?: unknown };
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    if (body.isDefault !== true) return jsonError('잘못된 요청이에요');

    const sql = getSql();
    const exists = await sql`select 1 from payment_methods where id = ${id} and user_id = ${userId}`;
    if (exists.length === 0) return jsonError('Not Found', 404);
    await sql.transaction([
        sql`update payment_methods set is_default = false where user_id = ${userId}`,
        sql`update payment_methods set is_default = true where id = ${id} and user_id = ${userId}`,
    ]);
    return Response.json({ methods: await listPaymentMethods(userId) });
}

export async function DELETE(request: Request, ctx: Ctx) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);
    const { id } = await ctx.params;
    if (!isUuid(id)) return jsonError('Not Found', 404);

    const sql = getSql();
    const target = await sql`select 1 from payment_methods where id = ${id} and user_id = ${userId}`;
    if (target.length === 0) return jsonError('Not Found', 404);

    const others = await sql`select id from payment_methods where user_id = ${userId} and id <> ${id}
                             order by is_default desc, created_at desc`;
    const inUse = await sql`select 1 from subscriptions where payment_method_id = ${id} and status <> 'canceled' limit 1`;
    if (inUse.length > 0 && others.length === 0) {
        return jsonError('정기구독에 사용 중인 유일한 카드예요. 새 카드를 먼저 등록해 주세요.', 409);
    }

    const replacement = (others[0]?.id as string | undefined) ?? null;
    await sql.transaction([
        // move live subscriptions to another saved card so billing keeps working
        sql`update subscriptions set payment_method_id = ${replacement}, updated_at = now()
            where payment_method_id = ${id} and status <> 'canceled'`,
        sql`delete from payment_methods where id = ${id} and user_id = ${userId}`,
        sql`update payment_methods set is_default = true
            where id = (select id from payment_methods where user_id = ${userId} order by created_at desc limit 1)
              and not exists (select 1 from payment_methods where user_id = ${userId} and is_default)`,
    ]);
    return Response.json({ methods: await listPaymentMethods(userId) });
}
