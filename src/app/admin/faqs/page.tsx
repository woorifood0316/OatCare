import { listFaqs } from '../../../lib/inquiries';
import { workersAiReady } from '../../../lib/workers-ai';
import { FAQ_SEED } from '../../../lib/faq-seed';
import { FaqEditor, FaqRowActions, FaqSeedButton, FaqSyncButton, FaqTester } from '../../../components/admin/InquiryAdminActions';
import { CATALOG } from '../../../lib/catalog';

export const runtime = 'edge';

export default async function AdminFaqs() {
    let faqs: Awaited<ReturnType<typeof listFaqs>> = [];
    let ready = true;
    try {
        faqs = await listFaqs();
    } catch {
        ready = false;
    }
    const aiReady = workersAiReady();

    return (
        <>
            <h1 className="adm-h1">FAQ (자동 답변)</h1>
            <p className="adm-muted">
                손님이 상품 문의를 남기면 AI가 이 목록에서 맞는 답변을 골라 <b>적힌 문장 그대로</b> 바로 답해요. AI는 새 문장을 지어내지 않고, 맞는 답이 없으면 &lsquo;상품 문의&rsquo;의 답변
                대기로 넘겨요. 답변을 고치면 바로 반영돼요.
            </p>
            <p className={aiReady ? 'adm-muted' : 'adm-error'}>
                {aiReady
                    ? 'AI 연결됨 (Cloudflare Workers AI 무료 모델)'
                    : 'AI가 아직 연결되지 않았어요. 지금은 질문과 FAQ의 글자가 확실히 비슷할 때만 자동 답변해요. Cloudflare Pages > 설정 > 바인딩에서 Workers AI를 이름 AI로 추가해 주세요.'}
            </p>

            {!ready ? (
                <p className="adm-muted">FAQ 테이블이 아직 없어요. db/inquiries.sql을 먼저 실행해 주세요.</p>
            ) : (
                <>
                    <section className="adm-card">
                        <h2>답변 시험하기</h2>
                        <FaqTester products={CATALOG.map((c) => ({ sku: c.sku, name: c.name }))} />
                    </section>

                    <section className="adm-card">
                        <h2>제품 정보 답변</h2>
                        <p className="adm-muted">
                            영양정보·알레르기·보관 방법·제조원 답변은 포장 표기사항(상세페이지 마지막 장)으로 자동으로 만들어져요. 표기사항이 바뀌면 코드의 제품 정보를 고친 뒤 이 버튼을 눌러 주세요.
                        </p>
                        <FaqSyncButton />
                    </section>

                    <section className="adm-card">
                        <h2>새 FAQ 추가</h2>
                        <FaqEditor />
                    </section>

                    {faqs.length === 0 ? (
                        <section className="adm-card">
                            <p className="adm-muted">등록된 FAQ가 없어요. 먹는 방법·가격·배송·쿠폰·정기구독·교환반품 등 기본 답변 {FAQ_SEED.length}개를 넣을 수 있어요.</p>
                            <FaqSeedButton />
                        </section>
                    ) : (
                        <div className="adm-table-wrap">
                            <table className="adm-table">
                                <thead>
                                    <tr>
                                        <th>질문 · 키워드</th>
                                        <th>답변</th>
                                        <th>사용</th>
                                        <th>관리</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {faqs.map((f) => (
                                        <tr key={f.id} className={f.active ? '' : 'is-muted'}>
                                            <td className="adm-rv-body">
                                                <b>{f.question}</b>
                                                {f.keywords ? (
                                                    <small>
                                                        <br />
                                                        {f.keywords}
                                                    </small>
                                                ) : null}
                                            </td>
                                            <td className="adm-rv-body">{f.answer}</td>
                                            <td>
                                                {f.hits}회{f.active ? '' : ' · 중지'}
                                            </td>
                                            <td>
                                                <FaqRowActions faq={f} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </>
    );
}
