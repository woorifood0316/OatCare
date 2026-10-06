import { getSql } from '../../../../lib/db';
import { isUuid, jsonError, sameOrigin, sessionUserId } from '../../../../lib/api';
import { parseAddressInput } from '../../../../lib/validate';
import { listAddresses } from '../../../../lib/addresses';

export const runtime = 'edge';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);
    const { id } = await ctx.params;
    if (!isUuid(id)) return jsonError('Not Found', 404);

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    const sql = getSql();
    const exists = await sql`select 1 from addresses where id = ${id} and user_id = ${userId}`;
    if (exists.length === 0) return jsonError('Not Found', 404);

    // Only flipping the default flag
    if (body && typeof body === 'object' && Object.keys(body).length === 1 && 'isDefault' in body) {
        await sql.transaction([
            sql`update addresses set is_default = false where user_id = ${userId}`,
            sql`update addresses set is_default = true, updated_at = now() where id = ${id} and user_id = ${userId}`,
        ]);
        return Response.json({ addresses: await listAddresses(userId) });
    }

    const parsed = parseAddressInput(body);
    if (!parsed.ok) return jsonError(parsed.error);
    const a = parsed.data;
    await sql.transaction([
        sql`update addresses set is_default = false where user_id = ${userId} and ${a.isDefault} and id <> ${id}`,
        sql`update addresses set label = ${a.label}, recipient = ${a.recipient}, phone = ${a.phone},
            zipcode = ${a.zipcode}, address1 = ${a.address1}, address2 = ${a.address2},
            is_default = (is_default or ${a.isDefault}), updated_at = now()
            where id = ${id} and user_id = ${userId}`,
    ]);
    return Response.json({ addresses: await listAddresses(userId) });
}

export async function DELETE(request: Request, ctx: Ctx) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);
    const { id } = await ctx.params;
    if (!isUuid(id)) return jsonError('Not Found', 404);

    const sql = getSql();
    await sql.transaction([
        sql`delete from addresses where id = ${id} and user_id = ${userId}`,
        // keep exactly one default if any address remains
        sql`update addresses set is_default = true
            where id = (select id from addresses where user_id = ${userId} order by created_at asc limit 1)
            and not exists (select 1 from addresses where user_id = ${userId} and is_default)`,
    ]);
    return Response.json({ addresses: await listAddresses(userId) });
}
