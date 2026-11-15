import { Star } from 'lucide-react';
import { getCurrentUser } from '../../../lib/current-user';
import { listMyReviews, listReviewables, reviewStanding } from '../../../lib/reviews';
import { r2Config } from '../../../lib/r2';
import { REVIEW_STRIKE_LIMIT, getItem } from '../../../lib/catalog';
import { VIOLATION_LABEL } from '../../../lib/review-filter';
import { PageHead } from '../../../components/mypage/ComingSoon';
import { InviteLine } from '../../../components/share/InviteNudge';
import { ReviewForm, ReviewPolicy } from '../../../components/reviews/ReviewForm';

export const runtime = 'edge';

const day = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export default async function MyReviewsPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
    const user = await getCurrentUser('/mypage/reviews');
    const { key } = await searchParams;

    let ready = true;
    let items: Awaited<ReturnType<typeof listReviewables>> = [];
    let mine: Awaited<ReturnType<typeof listMyReviews>> = [];
    let standing = { strikes: 0, banned: false };
    try {
        [items, mine, standing] = await Promise.all([listReviewables(user.id), listMyReviews(user.id), reviewStanding(user.id)]);
    } catch {
        ready = false; // reviews tables not created yet
    }

    return (
        <>
            <PageHead title="리뷰 쓰기" desc="받아보신 상품의 솔직한 후기를 남겨 주세요. 리뷰 이벤트에 참여하면 쿠폰을 드려요." />

            {!ready ? (
                <section className="my-card my-placeholder">
                    <Star size={24} />
                    <p>리뷰 기능을 준비하고 있어요</p>
                </section>
            ) : standing.banned ? (
                <section className="my-card">
                    <p className="my-error">리뷰 운영정책 위반이 {REVIEW_STRIKE_LIMIT}회 쌓여 리뷰를 작성할 수 없는 계정이에요.</p>
                    <ReviewPolicy />
                </section>
            ) : items.length === 0 ? (
                <section className="my-card my-placeholder">
                    <Star size={24} />
                    <p>지금 리뷰를 쓸 수 있는 상품이 없어요</p>
                    <small>상품이 발송되면 이곳에서 리뷰를 쓸 수 있어요. 일반 구매는 상품마다, 정기구독은 구독마다 한 번씩이에요.</small>
                </section>
            ) : (
                <>
                    {standing.strikes > 0 ? (
                        <p className="my-error">
                            리뷰 운영정책 위반 {standing.strikes}회 · {REVIEW_STRIKE_LIMIT}회가 되면 리뷰 작성이 제한되고 회원 자격이 상실될 수 있어요.
                        </p>
                    ) : null}
                    <ReviewForm items={items} initialKey={key} photosEnabled={Boolean(r2Config())} />
                </>
            )}

            {mine.length > 0 ? (
                <section className="my-card">
                    <h2 className="co-h2">내가 쓴 리뷰</h2>
                    <ul className="rv-mine">
                        {mine.map((r) => (
                            <li key={r.id} className={r.status === 'deleted' ? 'is-deleted' : ''}>
                                <div className="rv-mine__head">
                                    <b>{getItem(r.sku)?.name ?? r.sku}</b>
                                    <span className="rv-mine__stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                                    <small>{day(r.createdAt)}</small>
                                </div>
                                <p>{r.body}</p>
                                {r.status === 'deleted' ? (
                                    <p className="my-error">
                                        삭제됨 · {VIOLATION_LABEL[(r.deletedCategory as keyof typeof VIOLATION_LABEL) ?? 'other'] ?? '기타'}
                                        {r.deletedReason ? ` · ${r.deletedReason}` : ''}
                                    </p>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {/* the invitation comes after the member's own reviews */}
            {mine.length > 0 ? <InviteLine text="내가 맛보고 평가한 그 맛, 친구는 어떻게 평가할까요?" /> : null}
        </>
    );
}
