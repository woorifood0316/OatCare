import Link from 'next/link';
import { adminListInquiries } from '../../../lib/inquiries';
import { getItem } from '../../../lib/catalog';
import { day } from '../../../components/admin/format';
import { InquiryAnswerBox } from '../../../components/admin/InquiryAdminActions';

export const runtime = 'edge';

const FILTERS = { pending: '답변 대기', answered: '답변 완료', hidden: '숨김', all: '전체' } as const;
type Filter = keyof typeof FILTERS;

export default async function AdminInquiries({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
    const { status: raw } = await searchParams;
    const status: Filter = raw && raw in FILTERS ? (raw as Filter) : 'pending';
    let rows: Awaited<ReturnType<typeof adminListInquiries>> = [];
    let ready = true;
    try {
        rows = await adminListInquiries(status);
    } catch {
        ready = false;
    }

    return (
        <>
            <h1 className="adm-h1">상품 문의</h1>
            <div className="adm-row adm-tabs">
                {(Object.keys(FILTERS) as Filter[]).map((f) => (
                    <Link key={f} href={`/admin/inquiries?status=${f}`} className={`adm-btn${f === status ? ' adm-btn--primary' : ''}`}>
                        {FILTERS[f]}
                    </Link>
                ))}
            </div>
            <p className="adm-muted">
                AI가 ‘AI 참고 정보’를 바탕으로 답변을 써요. 여기에는 AI가 답하지 못한 문의(불만·하자, 건강 관련, 개인정보 포함, 정보로 답할 수 없음)가 쌓여요. 답변할 때{' '}
                <b>정보에 추가</b>를 켜 두면 다음부터 비슷한 질문에 AI가 그 정보로 답해요. AI 답변이 틀렸다면 <b>답변 완료</b>에서 고치고, <Link href="/admin/faqs">FAQ</Link>도 함께 다듬어 주세요.
            </p>

            {!ready ? (
                <p className="adm-muted">상품 문의 테이블이 아직 없어요. db/inquiries.sql을 먼저 실행해 주세요.</p>
            ) : rows.length === 0 ? (
                <p className="adm-muted">해당하는 문의가 없어요.</p>
            ) : (
                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr>
                                <th>날짜</th>
                                <th>상품</th>
                                <th>문의</th>
                                <th>답변</th>
                                <th>처리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((q) => (
                                <tr key={q.id} className={q.status === 'hidden' ? 'is-muted' : ''}>
                                    <td>{day(q.createdAt)}</td>
                                    <td>{getItem(q.sku)?.name ?? q.sku}</td>
                                    <td className="adm-rv-body">
                                        {q.secret ? '🔒 ' : ''}
                                        {q.body}
                                        <small>
                                            <br />
                                            {q.authorName}
                                            {q.email ? ` · ${q.email}` : ''}
                                        </small>
                                        {q.aiNote ? <small className="adm-muted"><br />자동 답변: {q.aiNote}</small> : null}
                                        {q.hiddenReason ? <small className="adm-error"><br />숨김: {q.hiddenReason}</small> : null}
                                    </td>
                                    <td className="adm-rv-body">
                                        {q.answer ? (
                                            <>
                                                <small>{q.answeredBy === 'ai' ? '🤖 AI' : '관리자'}</small>
                                                <br />
                                                {q.answer}
                                            </>
                                        ) : (
                                            <span className="adm-muted">-</span>
                                        )}
                                    </td>
                                    <td>
                                        <InquiryAnswerBox id={q.id} question={q.body} current={q.answer} status={q.status} />
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
