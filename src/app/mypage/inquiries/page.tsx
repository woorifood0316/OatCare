import Link from 'next/link';
import { Lock, MessageCircleQuestion } from 'lucide-react';
import { getCurrentUser } from '../../../lib/current-user';
import { listMyInquiries } from '../../../lib/inquiries';
import { getItem } from '../../../lib/catalog';
import { slugForFlavor, slugForSetName } from '../../../lib/products';
import { PageHead } from '../../../components/mypage/ComingSoon';

export const runtime = 'edge';

const day = (iso: string) => new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

/** Product page for a SKU, so the member can go back to where they asked. */
function productHref(sku: string): string | null {
    const item = getItem(sku);
    if (!item) return null;
    if (sku.startsWith('single:')) {
        const slug = slugForFlavor(sku.slice('single:'.length));
        return slug ? `/products/${slug}#pd-qna` : null;
    }
    const set = slugForSetName(item.name) ?? sku.replace('bundle:', '');
    return `/sets/${set}#pd-qna`;
}

export default async function MyInquiriesPage() {
    const user = await getCurrentUser('/mypage/inquiries');
    let list: Awaited<ReturnType<typeof listMyInquiries>> = [];
    try {
        list = await listMyInquiries(user.id);
    } catch {
        list = [];
    }

    return (
        <>
            <PageHead title="상품 문의" desc="내가 남긴 문의와 답변을 확인하세요. 새 문의는 각 상품 페이지의 상품문의 탭에서 남길 수 있어요." />
            {list.length === 0 ? (
                <section className="my-card my-placeholder">
                    <MessageCircleQuestion size={24} />
                    <p>아직 남긴 문의가 없어요</p>
                    <small>궁금한 점은 상품 페이지의 상품문의 탭에서 남겨 주세요. 자주 묻는 질문은 AI가 바로 답변해 드려요.</small>
                </section>
            ) : (
                list.map((q) => {
                    const href = productHref(q.sku);
                    return (
                        <section key={q.id} className="my-card qa-my">
                            <div className="qa-my__head">
                                {href ? <Link href={href}>{getItem(q.sku)?.name ?? q.sku}</Link> : <span>{q.sku}</span>}
                                <span className={`rt-badge${q.status === 'answered' ? ' rt-badge--completed' : ''}`}>{q.status === 'answered' ? '답변 완료' : '답변 대기'}</span>
                            </div>
                            <p className="qa-my__q">
                                {q.secret ? <Lock size={13} className="qa-lock" /> : null}
                                {q.body}
                            </p>
                            <small className="qa-my__date">{day(q.createdAt)}</small>
                            {q.answer ? (
                                <div className="qa-a">
                                    <span className="qa-tag qa-tag--a">답변</span>
                                    <div>
                                        <b className="qa-row__who">
                                            참오트케어
                                            {q.answeredBy === 'ai' ? <span className="qa-ai">AI 자동 답변</span> : null}
                                        </b>
                                        <p>{q.answer}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="qa-wait">{q.waiting === 'auto' ? '답변을 준비하고 있어요. 잠시 후 다시 확인해 주세요.' : '담당자가 확인 후 답변드릴게요. 답변이 달리면 이곳에 보여요.'}</p>
                            )}
                        </section>
                    );
                })
            )}
        </>
    );
}
