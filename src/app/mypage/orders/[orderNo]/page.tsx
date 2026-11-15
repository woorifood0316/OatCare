import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '../../../../lib/current-user';
import { getOrderByNo } from '../../../../lib/orders';
import { customerCanCancel, trackingUrl } from '../../../../lib/order-status';
import { OrderBrief } from '../../../../components/checkout/OrderBrief';
import { OrderCancelButton } from '../../../../components/mypage/OrderCancelButton';
import { PageHead } from '../../../../components/mypage/ComingSoon';
import { ReturnStatus } from '../../../../components/returns/ReturnStatus';
import { InviteLine } from '../../../../components/share/InviteNudge';
import { listReturnsForOrder, returnWindow, returnableLines, type ReturnRequest } from '../../../../lib/returns';

const md = (d: Date | null) => (d ? d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' }) : '');

export const runtime = 'edge';

export default async function OrderDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ orderNo: string }>;
    searchParams: Promise<{ return?: string }>;
}) {
    const { orderNo } = await params;
    const { return: returnFlag } = await searchParams;
    const user = await getCurrentUser(`/mypage/orders/${orderNo}`);
    const order = await getOrderByNo(orderNo, user.id);
    if (!order || order.status === 'pending') notFound();

    const url = trackingUrl(order.carrier, order.trackingNo);

    let returns: ReturnRequest[] = [];
    let returnsReady = true;
    try {
        returns = await listReturnsForOrder(order.id);
    } catch {
        returns = []; // table not created yet
        returnsReady = false;
    }
    const win = returnWindow(order);
    const canRequest =
        returnsReady &&
        win.open && !returns.some((r) => r.status === 'requested' || r.status === 'approved') && returnableLines(order, returns).length > 0;
    const deadlines = win.open
        ? `단순 변심(미개봉) ${win.changeOfMind ? `${md(win.changeOfMindUntil)}까지` : '기간 지남'} · 상품 하자·오배송 ${md(win.defectUntil)}까지`
        : null;

    return (
        <>
            <PageHead title="주문 상세" />
            <OrderBrief order={order} />

            {order.carrier && order.trackingNo ? (
                <section id="tracking" className="my-card">
                    <h2 className="my-card__title">배송 조회</h2>
                    <dl className="my-dl">
                        <div>
                            <dt>택배사</dt>
                            <dd>{order.carrier}</dd>
                        </div>
                        <div>
                            <dt>운송장 번호</dt>
                            <dd>
                                {url ? (
                                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--oc-maroon)' }}>
                                        {order.trackingNo}
                                    </a>
                                ) : (
                                    order.trackingNo
                                )}
                            </dd>
                        </div>
                    </dl>
                </section>
            ) : null}

            {order.shipMemo ? (
                <section className="my-card">
                    <h2 className="my-card__title">배송 요청사항</h2>
                    <p style={{ margin: 0 }}>{order.shipMemo}</p>
                </section>
            ) : null}

            {order.status === 'canceled' ? (
                <section className="my-card">
                    <h2 className="my-card__title">취소 정보</h2>
                    <p style={{ margin: 0 }}>
                        {order.canceledAt ? new Date(order.canceledAt).toLocaleDateString('ko-KR') : ''} · {order.cancelReason ?? ''}
                    </p>
                </section>
            ) : null}

            <ReturnStatus orderNo={order.orderNo} requests={returns} canRequest={canRequest} deadlines={deadlines} justSent={returnFlag === 'done'} />

            {customerCanCancel(order.status) ? <OrderCancelButton orderNo={order.orderNo} /> : null}
            {order.status === 'failed' ? (
                <section className="my-card">
                    <p className="my-error" style={{ margin: 0 }}>
                        {order.failReason ?? '결제에 실패한 주문이에요'}
                    </p>
                </section>
            ) : null}

            {order.status === 'delivered' && !returns.some((r) => r.status !== 'withdrawn' && r.status !== 'rejected') ? <InviteLine /> : null}

            <p className="cart-note">
                문의: 고객센터 031-998-7234
            </p>
        </>
    );
}
