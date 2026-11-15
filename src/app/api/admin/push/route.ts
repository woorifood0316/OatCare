import { PROMO_BODY_MAX, PROMO_TITLE_MAX, createPromo, isNight, listPromos, promoAudience } from '../../../../lib/promo-push';
import { jsonError, requireAdmin, sameOrigin } from '../../../../lib/api';

export const runtime = 'edge';

/** How many members would receive one now, whether it is night (it would wait), and the past messages. */
export async function GET() {
    if (!(await requireAdmin())) return jsonError('Forbidden', 403);
    const [audience, promos] = await Promise.all([promoAudience(), listPromos()]);
    return Response.json({ audience, night: isNight(), promos });
}

/** Queue one event / benefit notification: { title, body, url }. */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    if (!(await requireAdmin())) return jsonError('Forbidden', 403);
    const b = (await request.json().catch(() => ({}))) as { title?: unknown; body?: unknown; url?: unknown };
    const title = typeof b.title === 'string' ? b.title.trim() : '';
    const body = typeof b.body === 'string' ? b.body.trim() : '';
    const url = typeof b.url === 'string' && b.url.trim() ? b.url.trim() : '/';
    if (!title || title.length > PROMO_TITLE_MAX) return jsonError(`제목은 1~${PROMO_TITLE_MAX}자로 써 주세요`);
    if (!body || body.length > PROMO_BODY_MAX) return jsonError(`내용은 1~${PROMO_BODY_MAX}자로 써 주세요`);
    if (!url.startsWith('/') || url.startsWith('//')) return jsonError('연결할 페이지는 / 로 시작하는 사이트 주소로 써 주세요 (예: /sets/20)');
    if (/^\(?\s*광고\s*\)?/.test(title)) return jsonError('제목 앞의 (광고)는 자동으로 붙어요. 빼고 써 주세요');
    const r = await createPromo({ title, body, url });
    return Response.json(r);
}
