import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '../../../../../lib/current-user';
import { getOrderByNo } from '../../../../../lib/orders';
import { listReturnsForOrder, refundedSoFar, returnWindow, returnableLines } from '../../../../../lib/returns';
import { r2PrivateConfig } from '../../../../../lib/r2';
import { PageHead } from '../../../../../components/mypage/ComingSoon';
import { ReturnForm } from '../../../../../components/returns/ReturnForm';

export const runtime = 'edge';

const md = (d: Date | null) => (d ? d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' }) : '');

export default async function ReturnRequestPage({ params }: { params: Promise<{ orderNo: string }> }) {
    const { orderNo } = await params;
    const user = await getCurrentUser(`/mypage/orders/${orderNo}/return`);
    const order = await getOrderByNo(orderNo, user.id);
    if (!order || order.status === 'pending') notFound();

    const win = returnWindow(order);
    const existing = await listReturnsForOrder(order.id);
    const open = existing.find((r) => r.status === 'requested' || r.status === 'approved');
    const lines = returnableLines(order, existing);

    let blocked: string | null = null;
    if (!win.open) blocked = order.status === 'shipped' || order.status === 'delivered' ? '신청 기간이 지난 주문이에요.' : '상품이 발송된 뒤에 신청할 수 있어요.';
    else if (open) blocked = '이 주문은 이미 진행 중인 교환·반품 신청이 있어요.';
    else if (lines.length === 0) blocked = '교환·반품할 수 있는 상품이 남아 있지 않아요.';

    return (
        <>
            <PageHead title="교환·반품 신청" desc={`주문번호 ${order.orderNo}`} />
            {blocked ? (
                <section className="my-card">
                    <p style={{ margin: 0 }}>{blocked}</p>
                    <p className="cart-note">
                        궁금한 점은 고객센터 031-998-7234
                    </p>
                </section>
            ) : (
                <ReturnForm
                    order={order}
                    lines={lines}
                    alreadyRefunded={await refundedSoFar(order.id)}
                    changeOfMindOk={win.changeOfMind}
                    changeOfMindUntil={md(win.changeOfMindUntil)}
                    defectUntil={md(win.defectUntil)}
                    photosEnabled={Boolean(r2PrivateConfig())}
                />
            )}
        </>
    );
}
