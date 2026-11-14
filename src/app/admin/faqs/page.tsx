import { listFaqs } from '../../../lib/inquiries';
import { workersAiReady } from '../../../lib/workers-ai';
import { FAQ_SEED } from '../../../lib/faq-seed';
import { FaqEditor, FaqSeedButton, FaqSyncButton, FaqTester } from '../../../components/admin/InquiryAdminActions';
import { FaqList } from '../../../components/admin/FaqList';
import { CATALOG, getItem } from '../../../lib/catalog';

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
            <h1 className="adm-h1">AI 참고 정보 (자동 답변)</h1>
            <p className="adm-muted">
                손님이 상품 문의를 남기면 AI가 이 목록에서 <b>질문과 관련된 정보를 찾아 읽고, 그 내용만으로 답변을 직접 써요.</b> 여러 정보를 조합하는 질문(예: 맛별 당류 비교)도 답할 수 있어요.
                정보에 없는 내용이면 지어내지 않고 &lsquo;상품 문의&rsquo;의 답변 대기로 넘기고, 답변에 정보에 없는 숫자나 효능 표현이 있으면 자동으로 보류해요. 정보를 추가하거나 고치면 바로 반영돼요.
            </p>
            <p className={aiReady ? 'adm-muted' : 'adm-error'}>
                {aiReady
                    ? 'AI 연결됨 (Cloudflare Workers AI 무료 모델)'
                    : 'AI가 아직 연결되지 않았어요. 지금은 질문과 정보의 글자가 확실히 비슷할 때만 그 정보를 그대로 답해요. Cloudflare Pages > 설정 > 바인딩에서 Workers AI를 이름 AI로 추가해 주세요.'}
            </p>

            {!ready ? (
                <p className="adm-muted">FAQ 테이블이 아직 없어요. db/inquiries.sql을 먼저 실행해 주세요.</p>
            ) : (
                <>
                    <section className="adm-card">
                        <h2>답변 시험하기</h2>
                        <p className="adm-muted">손님처럼 질문하면 AI가 실제로 쓸 답변과 참고한 정보를 보여줘요. 저장되지 않아요.</p>
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
                        <h2>정보 추가</h2>
                        <p className="adm-muted">주제와 내용을 적어 두면 AI가 답변할 때 참고해요. 예: 주제 &ldquo;전자레인지 사용&rdquo; / 내용 &ldquo;전자레인지에 짧게 데워 드셔도 돼요&rdquo;</p>
                        <FaqEditor />
                    </section>

                    {faqs.length === 0 ? (
                        <section className="adm-card">
                            <p className="adm-muted">등록된 FAQ가 없어요. 먹는 방법·가격·배송·쿠폰·정기구독·교환반품 등 기본 답변 {FAQ_SEED.length}개를 넣을 수 있어요.</p>
                            <FaqSeedButton />
                        </section>
                    ) : (
                        <FaqList
                            scopes={['전체 상품', ...CATALOG.map((c) => c.name)]}
                            faqs={faqs.map((f) => ({
                                id: f.id,
                                question: f.question,
                                keywords: f.keywords,
                                answer: f.answer,
                                sku: f.sku,
                                scope: f.sku ? (getItem(f.sku)?.name ?? f.sku) : '전체 상품',
                                active: f.active,
                                hits: f.hits,
                                auto: Boolean(f.autoKey),
                            }))}
                        />
                    )}
                </>
            )}
        </>
    );
}
