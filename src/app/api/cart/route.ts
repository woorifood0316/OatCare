import { getSql } from '../../../lib/db';
import { sameOrigin, sessionUserId, jsonError } from '../../../lib/api';
import { sanitizeLines } from '../../../lib/catalog';

export const runtime = 'edge';

export async function GET() {
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);

    const rows = await getSql()`select lines from carts where user_id = ${userId}`;
    return Response.json({ lines: sanitizeLines(rows[0]?.lines ?? []) });
}

export async function PUT(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('Unauthorized', 401);

    let body: { lines?: unknown };
    try {
        body = await request.json();
    } catch {
        return jsonError('Bad Request');
    }
    const lines = sanitizeLines(body.lines);

    await getSql()`
        insert into carts (user_id, lines, updated_at)
        values (${userId}, ${JSON.stringify(lines)}::jsonb, now())
        on conflict (user_id) do update set lines = excluded.lines, updated_at = now()
    `;
    return Response.json({ lines });
}
