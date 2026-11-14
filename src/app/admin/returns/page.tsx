import Link from 'next/link';
import { adminListReturns, RETURN_REASON_LABEL, RETURN_STATUS_LABEL, RETURN_TYPE_LABEL, type ReturnStatus } from '../../../lib/returns';
import { day } from '../../../components/admin/format';
import { ReturnAdminActions } from '../../../components/admin/ReturnAdminActions';

export const runtime = 'edge';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const FILTERS = ['open', 'completed', 'rejected', 'withdrawn', 'all'] as const;
const FILTER_LABEL: Record<(typeof FILTERS)[number], string> = { open: '처리 중', completed: '완료', rejected: '반려', withdrawn: '고객 취소', all: '전체' };

export default async function AdminReturns({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
    const { status: raw } = await searchParams;
    const status = (FILTERS as readonly string[]).includes(raw ?? '') ? (raw as (typeof FILTERS)[number]) : 'open';
    let rows: Awaited<ReturnType<typeof adminListReturns>> = [];
    let ready = true;
    try {
        rows = await adminListReturns(status as ReturnStatus | 'open' | 'all');
    } catch {
        ready = false;
    }

    return (
        <>
            <h1 className="adm-h1">교환·반품</h1>
            <form className="adm-filters" method="get">
                <select name="status" defaultValue={status} aria-label="상태">
                    {FILTERS.map((f) => (
                        <option key={f} value={f}>
                            {FILTER_LABEL[f]}
                        </option>
                    ))}
                </select>
                <button type="submit" className="adm-btn adm-btn--primary">
                    보기
                </button>
            </form>
            <p className="adm-muted">
                순서: 접수 → <b>승인</b>(택배사에 회수 접수, 고객에게 알림) → 상품 도착·검수 → <b>환불 실행</b>(결제 부분 취소) 또는 <b>교환 재발송 완료</b>. 하자·오배송 사진은
                찍은 날짜(날짜 표시 또는 상세정보 캡처)를 꼭 확인하고, 의심되면 원본 파일을 요청한 뒤 반려 사유를 적어 반려하세요.
            </p>

            {!ready ? (
                <p className="adm-muted">교환·반품 테이블이 아직 없어요. db/returns.sql을 먼저 실행해 주세요.</p>
            ) : rows.length === 0 ? (
                <p className="adm-muted">해당하는 신청이 없어요.</p>
            ) : (
                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr>
                                <th>신청일</th>
                                <th>주문</th>
                                <th>유형</th>
                                <th>상품 · 내용</th>
                                <th>금액</th>
                                <th>상태</th>
                                <th>처리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id}>
                                    <td>{day(r.createdAt)}</td>
                                    <td>
                                        <Link href={`/admin/orders/${r.orderNo}`}>{r.orderNo}</Link>
                                        <br />
                                        <small>{r.buyer ?? '탈퇴 회원'}</small>
                                    </td>
                                    <td>
                                        {RETURN_TYPE_LABEL[r.type].split(' ')[0]}
                                        <br />
                                        <small>{RETURN_REASON_LABEL[r.reason]}</small>
                                    </td>
                                    <td className="adm-rv-body">
                                        {r.items.map((i) => `${i.name} ${i.qty}개`).join(', ')}
                                        {r.detail ? <div>{r.detail}</div> : null}
                                        {r.photos.length > 0 ? (
                                            <div className="adm-rv-photos">
                                                {r.photos.map((p) => (
                                                    <a key={p} href={p} target="_blank" rel="noopener noreferrer">
                                                        <img src={p} alt="" />
                                                    </a>
                                                ))}
                                            </div>
                                        ) : null}
                                        {r.adminNote ? <small>안내: {r.adminNote}</small> : null}
                                        {r.rejectReason ? <small className="adm-error">반려: {r.rejectReason}</small> : null}
                                    </td>
                                    <td>
                                        {r.type === 'refund' ? (
                                            r.refundAmount !== null ? (
                                                <>환불 {won(r.refundAmount)}</>
                                            ) : (
                                                <>
                                                    예상 {won(r.refundEstimate)}
                                                    {r.returnFee > 0 ? <small>
                                                        <br />
                                                        배송비 {won(r.returnFee)} 차감
                                                    </small> : null}
                                                </>
                                            )
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td>{RETURN_STATUS_LABEL[r.status]}</td>
                                    <td>
                                        <ReturnAdminActions id={r.id} status={r.status} type={r.type} estimate={r.refundEstimate} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
