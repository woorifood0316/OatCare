import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { getCurrentUser } from '../../../lib/current-user';
import { listMyReturns, RETURN_REASON_LABEL, RETURN_STATUS_LABEL, type ReturnRequest } from '../../../lib/returns';
import { PageHead } from '../../../components/mypage/ComingSoon';

export const runtime = 'edge';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const day = (iso: string) => new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

/** 교환·반품 내역: every request across orders, newest first; each opens its order (where 신청 취소 lives). */
export default async function MyReturnsPage() {
    const user = await getCurrentUser('/mypage/returns');
    let list: ReturnRequest[] = [];
    try {
        list = await listMyReturns(user.id);
    } catch {
        list = []; // table not created yet
    }

    return (
        <>
            <PageHead title="교환·반품 내역" desc="신청한 교환·반품의 진행 상황을 확인해요. 새 신청은 주문 상세에서 할 수 있어요." />

            {list.length === 0 ? (
                <section className="my-card my-placeholder">
                    <RotateCcw size={24} />
                    <p>교환·반품 신청 내역이 없어요</p>
                    <small>받으신 상품에 문제가 있으면 주문·배송 &gt; 주문 상세에서 신청해 주세요.</small>
                    <Link href="/mypage/orders" className="my-btn my-btn--primary">
                        주문·배송 보기
                    </Link>
                </section>
            ) : (
                <ul className="rt-list">
                    {list.map((r) => (
                        <li key={r.id}>
                            <Link href={`/mypage/orders/${r.orderNo}`} className="my-card rt-req rt-req--link">
                                <div className="rt-req__head">
                                    <b>
                                        {r.type === 'refund' ? '반품' : '교환'} · {RETURN_REASON_LABEL[r.reason]}
                                    </b>
                                    <span className={`rt-badge rt-badge--${r.status}`}>{RETURN_STATUS_LABEL[r.status]}</span>
                                </div>
                                <p>
                                    {day(r.createdAt)} 신청 · 주문번호 {r.orderNo}
                                </p>
                                <p>{r.items.map((i) => `${i.name} ${i.qty}개`).join(', ')}</p>
                                {r.type === 'refund' && r.status !== 'withdrawn' && r.status !== 'rejected' ? (
                                    <p>
                                        {r.status === 'completed' && r.refundAmount !== null
                                            ? `환불 ${won(r.refundAmount)}`
                                            : `예상 환불 ${won(r.refundEstimate)}${r.returnFee > 0 ? ` (반품 배송비 ${won(r.returnFee)} 차감)` : ''}`}
                                    </p>
                                ) : null}
                                {r.status === 'approved' ? <p>택배 기사님이 회수하러 방문할 예정이에요. 받으신 상자에 다시 포장해 두세요.</p> : null}
                                {r.status === 'rejected' && r.rejectReason ? <p className="my-error">반려 사유: {r.rejectReason}</p> : null}
                                <span className="rt-req__more">{r.status === 'requested' ? '주문 상세에서 신청 취소 가능 →' : '주문 상세 보기 →'}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}
