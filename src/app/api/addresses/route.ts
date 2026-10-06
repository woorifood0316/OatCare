import { getSql } from '../../../lib/db';
import { jsonError, sameOrigin, sessionUserId } from '../../../lib/api';
import { parseAddressInput } from '../../../lib/validate';
import { listAddresses } from '../../../lib/addresses';

export const runtime = 'edge';

const MAX_ADDRESSES = 10;

export async function GET() {
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);
    return Response.json({ addresses: await listAddresses(userId) });
}

export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    const parsed = parseAddressInput(body);
    if (!parsed.ok) return jsonError(parsed.error);
    const a = parsed.data;

    const sql = getSql();
    const count = (await sql`select count(*)::int as n from addresses where user_id = ${userId}`)[0].n as number;
    if (count >= MAX_ADDRESSES) return jsonError(`배송지는 최대 ${MAX_ADDRESSES}개까지 저장할 수 있어요`);

    const makeDefault = a.isDefault || count === 0;
    const results = await sql.transaction([
        sql`update addresses set is_default = false where user_id = ${userId} and ${makeDefault}`,
        sql`insert into addresses (user_id, label, recipient, phone, zipcode, address1, address2, is_default)
            values (${userId}, ${a.label}, ${a.recipient}, ${a.phone}, ${a.zipcode}, ${a.address1}, ${a.address2}, ${makeDefault})
            returning id`,
    ]);
    const id = (results[1] as { id: string }[])[0].id;
    return Response.json({ id, addresses: await listAddresses(userId) });
}
