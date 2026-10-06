import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrderByNo } from '../../../../lib/orders';
import { getSql } from '../../../../lib/db';
import { ORDER_STATUS_LABEL, trackingUrl } from '../../../../lib/order-status';
import { FLAVORS } from '../../../../lib/catalog';
import { AdminOrderActions } from '../../../../components/admin/AdminActions';
import { dt, won } from '../../../../components/admin/format';

export const runtime = 'edge';

export default async function AdminOrderDetail({ params }: { params: Promise<{ orderNo: string }> }) {
    const { orderNo } = await params;
    const order = await getOrderByNo(orderNo);
    if (!order) notFound();

    const buyer = order.userId
        ? (await getSql()`select name, email from users where id = ${order.userId}`)[0]
        : undefined;
    const url = trackingUrl(order.carrier, order.trackingNo);
    const refundable = ['paid', 'preparing', 'shipped', 'delivered'].includes(order.status) && Boolean(order.paymentKey);

    return (
        <>
            <p>
                <Link href="/admin/orders" className="adm-muted">
                    ← 주문 목록
                </Link>
            </p>
            <h1 className="adm-h1">
                {order.orderNo} <span className={`ord-status ord-status--${order.status}`}>{ORDER_STATUS_LABEL[order.status]}</span>
            </h1>

            <div className="adm-cols">
                <section className="adm-card">
                    <h2>주문 상품</h2>
                    <ul className="adm-lines">
                        {order.items.map((it, i) => (
                            <li key={i}>
                                <div>
                                    <strong>
                                        {it.name} × {it.qty}
                                    </strong>
                                    {it.mixBreakdown ? (
                                        <span>
                                            {FLAVORS.filter((f) => (it.mixBreakdown![f] ?? 0) > 0)
                                                .map((f) => `${f} ${it.mixBreakdown![f]}`)
                                                .join(' · ')}
                                        </span>
                                    ) : null}
                                    {it.cycleDays ? <span>{it.cycleDays}일 주기 정기배송</span> : null}
                                </div>
                                <b>{won(it.amount)}</b>
                            </li>
                        ))}
                    </ul>
                    <dl className="adm-dl">
                        <div>
                            <dt>상품 금액</dt>
                            <dd>{won(order.subtotal)}</dd>
                        </div>
                        <div>
                            <dt>배송비</dt>
                            <dd>{order.shippingFee === 0 ? '무료' : won(order.shippingFee)}</dd>
                        </div>
                        <div>
                            <dt>결제 금액</dt>
                            <dd>
                                <b>{won(order.amount)}</b>
                            </dd>
                        </div>
                    </dl>
                </section>

                <section className="adm-card">
                    <h2>배송·주문자</h2>
                    <dl className="adm-dl">
                        <div>
                            <dt>받는 분</dt>
                            <dd>{order.shipName}</dd>
                        </div>
                        <div>
                            <dt>연락처</dt>
                            <dd>{order.shipPhone}</dd>
                        </div>
                        <div>
                            <dt>주소</dt>
                            <dd>
                                {order.shipZip ? `(${order.shipZip}) ` : ''}
                                {order.shipAddress1} {order.shipAddress2 ?? ''}
                            </dd>
                        </div>
                        <div>
                            <dt>요청사항</dt>
                            <dd>{order.shipMemo ?? '-'}</dd>
                        </div>
                        <div>
                            <dt>주문 회원</dt>
                            <dd>{buyer ? `${buyer.name ?? ''} ${buyer.email ? `(${buyer.email})` : ''}` : '탈퇴한 회원'}</dd>
                        </div>
                        {order.carrier ? (
                            <div>
                                <dt>택배</dt>
                                <dd>
                                    {order.carrier}{' '}
                                    {url ? (
                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                            {order.trackingNo}
                                        </a>
                                    ) : (
                                        order.trackingNo
                                    )}
                                </dd>
                            </div>
                        ) : null}
                    </dl>
                </section>
            </div>

            <section className="adm-card">
                <h2>결제 정보</h2>
                <dl className="adm-dl">
                    <div>
                        <dt>유형</dt>
                        <dd>{order.kind === 'subscription' ? '정기구독 결제' : '일반 결제'}</dd>
                    </div>
                    <div>
                        <dt>결제 수단</dt>
                        <dd>{order.paymentLabel ?? '-'}</dd>
                    </div>
                    <div>
                        <dt>결제 키 종류</dt>
                        <dd>{order.keyType === 'api' ? '개별 연동(빌링)' : order.keyType === 'widget' ? '결제위젯' : '-'}</dd>
                    </div>
                    <div>
                        <dt>paymentKey</dt>
                        <dd className="adm-break">{order.paymentKey ?? '-'}</dd>
                    </div>
                    <div>
                        <dt>결제 일시</dt>
                        <dd>{dt(order.paidAt)}</dd>
                    </div>
                    {order.canceledAt ? (
                        <div>
                            <dt>취소</dt>
                            <dd>
                                {dt(order.canceledAt)} · {order.cancelReason}
                            </dd>
                        </div>
                    ) : null}
                    {order.failReason ? (
                        <div>
                            <dt>실패 사유</dt>
                            <dd className="adm-error">{order.failReason}</dd>
                        </div>
                    ) : null}
                </dl>
            </section>

            {order.status !== 'canceled' && order.status !== 'failed' && order.status !== 'pending' ? (
                <AdminOrderActions
                    orderNo={order.orderNo}
                    status={order.status}
                    carrier={order.carrier}
                    trackingNo={order.trackingNo}
                    canRefund={refundable}
                />
            ) : null}
        </>
    );
}
