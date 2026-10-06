import Link from 'next/link';
import { Package } from 'lucide-react';
import { getCurrentUser } from '../../../lib/current-user';
import { listOrders } from '../../../lib/orders';
import { ORDER_STATUS_LABEL } from '../../../lib/order-status';
import { PageHead } from '../../../components/mypage/ComingSoon';

export const runtime = 'edge';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export default async function OrdersPage() {
    const user = await getCurrentUser();
    const orders = await listOrders(user.id);

    return (
        <>
            <PageHead title="주문·배송" desc="주문 내역과 배송 현황을 확인해요." />
            {orders.length === 0 ? (
                <section className="my-card my-placeholder">
                    <Package size={24} />
                    <p>아직 주문 내역이 없어요</p>
                    <Link href="/#product-lineup" className="my-btn my-btn--primary">
                        제품 둘러보기
                    </Link>
                </section>
            ) : (
                <ul className="ord-list">
                    {orders.map((o) => (
                        <li key={o.id}>
                            <Link href={`/mypage/orders/${o.orderNo}`} className="my-card ord-card">
                                <div className="ord-card__top">
                                    <span className={`ord-status ord-status--${o.status}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                                    <span className="ord-card__date">
                                        {new Date(o.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        {o.kind === 'subscription' ? ' · 정기구독' : ''}
                                    </span>
                                </div>
                                <strong>
                                    {o.items[0]?.name ?? '주문'}
                                    {o.items.length > 1 ? ` 외 ${o.items.length - 1}건` : ''}
                                </strong>
                                <div className="ord-card__bottom">
                                    <span>{o.orderNo}</span>
                                    <b>{won(o.amount)}</b>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}
