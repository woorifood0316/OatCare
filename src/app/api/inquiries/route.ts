import { getSql } from '../../../lib/db';
import { jsonError, sameOrigin, sessionUserId } from '../../../lib/api';
import { getItem } from '../../../lib/catalog';
import { createInquiry, listProductInquiries } from '../../../lib/inquiries';

export const runtime = 'edge';

/** Q&A for one product. Secret questions show their text only to the person who asked. */
export async function GET(request: Request) {
    const sku = new URL(request.url).searchParams.get('sku') ?? '';
    if (!getItem(sku)) return jsonError('Not Found', 404);
    const viewer = await sessionUserId();
    try {
        return Response.json({ inquiries: await listProductInquiries(sku, viewer), signedIn: Boolean(viewer) });
    } catch {
        return Response.json({ inquiries: [], signedIn: Boolean(viewer), unavailable: true });
    }
}

export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('회원만 문의를 남길 수 있어요. 로그인 후 이용해 주세요.', 401);

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    const sku = String(body.sku ?? '');
    if (!getItem(sku)) return jsonError('상품을 찾을 수 없어요', 404);
    const rows = await getSql()`select name from users where id = ${userId}`;
    const result = await createInquiry({
        userId,
        userName: (rows[0]?.name as string | null) ?? null,
        sku,
        body: typeof body.body === 'string' ? body.body : '',
        secret: body.secret === true,
    });
    if (!result.ok) return jsonError(result.message);
    return Response.json({ answered: result.answered, inquiries: await listProductInquiries(sku, userId) });
}
