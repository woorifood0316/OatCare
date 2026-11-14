import { adminListReviews } from '../../../lib/reviews';
import { REVIEW_STRIKE_LIMIT, getItem } from '../../../lib/catalog';
import { VIOLATION_LABEL } from '../../../lib/review-filter';
import { day } from '../../../components/admin/format';
import { ExpelButton, ReviewDeleteButton } from '../../../components/admin/ReviewAdminActions';

export const runtime = 'edge';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
    const { status = 'visible', q } = await searchParams;
    let reviews: Awaited<ReturnType<typeof adminListReviews>> = [];
    let ready = true;
    try {
        reviews = await adminListReviews({ status, q });
    } catch {
        ready = false;
    }

    return (
        <>
            <h1 className="adm-h1">리뷰</h1>
            <form className="adm-filters" method="get">
                <select name="status" defaultValue={status} aria-label="상태">
                    <option value="visible">게시 중</option>
                    <option value="deleted">삭제됨</option>
                    <option value="all">전체</option>
                </select>
                <input name="q" defaultValue={q ?? ''} placeholder="내용·이름·이메일" aria-label="검색" />
                <button type="submit" className="adm-btn adm-btn--primary">
                    검색
                </button>
            </form>
            <p className="adm-muted">
                욕설·비방 / 개인정보 / 광고·홍보로 삭제하면 위반 1회로 기록되고, 사용 전 이벤트 쿠폰은 회수돼요. 위반 {REVIEW_STRIKE_LIMIT}회가 되면
                리뷰 작성이 막히고 회원 제명을 할 수 있어요. 나쁜 평가라는 이유만으로는 삭제하지 마세요(표시광고법).
            </p>

            {!ready ? (
                <p className="adm-muted">리뷰 테이블이 아직 없어요. db/reviews.sql을 먼저 실행해 주세요.</p>
            ) : (
                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr>
                                <th>작성일</th>
                                <th>상품</th>
                                <th>별점</th>
                                <th>내용</th>
                                <th>작성자</th>
                                <th>이벤트</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.map((r) => (
                                <tr key={r.id} className={r.status === 'deleted' ? 'is-muted' : ''}>
                                    <td>{day(r.createdAt)}</td>
                                    <td>
                                        {getItem(r.sku)?.name ?? r.sku}
                                        {r.kind === 'subscription' ? ' (구독)' : ''}
                                    </td>
                                    <td>{'★'.repeat(r.rating)}</td>
                                    <td className="adm-rv-body">
                                        {r.body}
                                        {r.photos.length > 0 ? (
                                            <div className="adm-rv-photos">
                                                {r.photos.map((p) => (
                                                    <a key={p} href={p} target="_blank" rel="noopener noreferrer">
                                                        <img src={p} alt="" />
                                                    </a>
                                                ))}
                                            </div>
                                        ) : null}
                                        {r.status === 'deleted' ? (
                                            <small className="my-error">
                                                삭제 · {VIOLATION_LABEL[(r.deletedCategory as keyof typeof VIOLATION_LABEL) ?? 'other']} · {r.deletedReason}
                                            </small>
                                        ) : null}
                                    </td>
                                    <td>
                                        {r.userName ?? '(탈퇴)'} <small>{r.authorName}</small>
                                        {r.userEmail ? <div className="adm-muted">{r.userEmail}</div> : null}
                                        {r.strikes > 0 ? (
                                            <div className={r.banned ? 'my-error' : 'adm-muted'}>
                                                위반 {r.strikes}회{r.banned ? ' · 작성 제한' : ''}
                                            </div>
                                        ) : null}
                                    </td>
                                    <td>{r.eventJoined ? won(r.rewardAmount) : '-'}</td>
                                    <td>
                                        {r.status === 'visible' ? <ReviewDeleteButton id={r.id} /> : null}
                                        {r.banned && r.userId ? <ExpelButton userId={r.userId} name={r.userName ?? '회원'} /> : null}
                                    </td>
                                </tr>
                            ))}
                            {reviews.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="adm-muted">
                                        리뷰가 없어요
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
