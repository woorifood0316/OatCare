import { isUuid, jsonError, requireAdmin, sameOrigin } from '../../../../../lib/api';
import { adminDeleteReview } from '../../../../../lib/reviews';

export const runtime = 'edge';

const CATEGORIES = ['profanity', 'privacy', 'ad', 'other'] as const;

/** Operator: delete a review with a category and a written reason (violations count toward the member's strikes). */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    if (!(await requireAdmin())) return jsonError('Forbidden', 403);
    let body: { id?: unknown; category?: unknown; reason?: unknown };
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    if (!isUuid(body.id)) return jsonError('리뷰를 찾을 수 없어요', 404);
    const category = CATEGORIES.find((c) => c === body.category);
    if (!category) return jsonError('삭제 유형을 선택해 주세요');
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (reason.length < 2) return jsonError('삭제 사유를 적어 주세요');
    const result = await adminDeleteReview(body.id, category, reason.slice(0, 300));
    if (!result.ok) return jsonError('이미 삭제됐거나 없는 리뷰예요', 409);
    return Response.json(result);
}
