import { getSql } from '../../../lib/db';
import { jsonError, sameOrigin, sessionUserId } from '../../../lib/api';
import { REVIEW_MAX_LENGTH, REVIEW_MAX_PHOTOS, REVIEW_MIN_LENGTH, getItem } from '../../../lib/catalog';
import { createReview, listProductReviews, reviewStanding } from '../../../lib/reviews';
import { VIOLATION_LABEL, maskName, screenReview } from '../../../lib/review-filter';
import { r2Config } from '../../../lib/r2';

export const runtime = 'edge';

/** Public: visible reviews of one product. */
export async function GET(request: Request) {
    const sku = new URL(request.url).searchParams.get('sku') ?? '';
    if (!getItem(sku)) return jsonError('Not Found', 404);
    try {
        return Response.json(await listProductReviews(sku));
    } catch {
        // reviews table not created yet
        return Response.json({ reviews: [], stats: { count: 0, average: 0, stars: [0, 0, 0, 0, 0] } });
    }
}

/** Write a review for something the member bought (one per one-time order item / per subscription). */
export async function POST(request: Request) {
    if (!sameOrigin(request)) return jsonError('Forbidden', 403);
    const userId = await sessionUserId();
    if (!userId) return jsonError('로그인이 필요해요', 401);

    let body: { key?: unknown; rating?: unknown; body?: unknown; photos?: unknown; eventJoined?: unknown; agreedPolicy?: unknown };
    try {
        body = await request.json();
    } catch {
        return jsonError('잘못된 요청이에요');
    }
    if (body.agreedPolicy !== true) return jsonError('리뷰 운영정책을 확인해 주세요');
    const key = typeof body.key === 'string' ? body.key : '';
    const rating = Number(body.rating);
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    if (!key) return jsonError('리뷰할 상품을 선택해 주세요');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return jsonError('별점을 선택해 주세요');
    if (text.length < REVIEW_MIN_LENGTH) return jsonError(`후기를 ${REVIEW_MIN_LENGTH}자 이상 써 주세요`);
    if (text.length > REVIEW_MAX_LENGTH) return jsonError(`후기는 ${REVIEW_MAX_LENGTH}자까지 쓸 수 있어요`);

    // Only photos uploaded to our own bucket's review folder are accepted.
    const cfg = r2Config();
    const photos = Array.isArray(body.photos) ? body.photos.filter((p): p is string => typeof p === 'string') : [];
    if (photos.length > REVIEW_MAX_PHOTOS) return jsonError(`사진은 ${REVIEW_MAX_PHOTOS}장까지 올릴 수 있어요`);
    if (photos.some((p) => !cfg || !p.startsWith(`${cfg.publicUrl}/reviews/`))) return jsonError('사진을 다시 올려 주세요');

    const standing = await reviewStanding(userId);
    if (standing.banned) return jsonError('리뷰 운영정책 위반으로 리뷰를 작성할 수 없는 계정이에요', 403);

    const violation = screenReview(text);
    if (violation) {
        return jsonError(`${VIOLATION_LABEL[violation]}(으)로 보이는 내용이 있어 등록할 수 없어요. 내용을 고쳐서 다시 올려 주세요.`, 422, { violation });
    }

    const user = await getSql()`select name from users where id = ${userId}`;
    const result = await createReview({
        userId,
        authorName: maskName(user[0]?.name as string | null),
        key,
        rating,
        body: text,
        photos,
        eventJoined: body.eventJoined === true,
    });
    if (!result.ok) return jsonError(result.message, 409);
    return Response.json(result);
}
