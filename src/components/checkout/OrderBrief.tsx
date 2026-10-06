import React from 'react';
import { FLAVORS } from '../../lib/catalog';
import type { Order } from '../../lib/orders';
import { ORDER_STATUS_LABEL } from '../../lib/order-status';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const dt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

/** Compact order receipt used on result pages and order details. */
export function OrderBrief({ order }: { order: Order }) {
    return (
        <div className="co-brief">
            <dl className="my-dl">
                <div>
                    <dt>주문번호</dt>
                    <dd>{order.orderNo}</dd>
                </div>
                <div>
                    <dt>상태</dt>
                    <dd>{ORDER_STATUS_LABEL[order.status]}</dd>
                </div>
                <div>
                    <dt>결제 수단</dt>
                    <dd>{order.paymentLabel || '-'}</dd>
                </div>
                <div>
                    <dt>결제 일시</dt>
                    <dd>{dt(order.paidAt)}</dd>
                </div>
                <div>
                    <dt>결제 금액</dt>
                    <dd>{won(order.amount)}</dd>
                </div>
                <div>
                    <dt>받는 분</dt>
                    <dd>{order.shipName}</dd>
                </div>
                <div>
                    <dt>배송지</dt>
                    <dd>
                        {order.shipZip ? `(${order.shipZip}) ` : ''}
                        {order.shipAddress1} {order.shipAddress2 ?? ''}
                    </dd>
                </div>
            </dl>
            <ul className="co-brief__items">
                {order.items.map((it, i) => (
                    <li key={i}>
                        <span>
                            {it.name} × {it.qty}
                            {it.mixBreakdown
                                ? ` (${FLAVORS.filter((f) => (it.mixBreakdown![f] ?? 0) > 0)
                                      .map((f) => `${f} ${it.mixBreakdown![f]}`)
                                      .join(' · ')})`
                                : ''}
                        </span>
                        <b>{won(it.amount)}</b>
                    </li>
                ))}
            </ul>
        </div>
    );
}
