import Link from 'next/link';
import { PAGE_SIZE, searchOrders } from '../../../lib/admin-data';
import { ORDER_STATUS_LABEL } from '../../../lib/order-status';
import { dt, won } from '../../../components/admin/format';

export const runtime = 'edge';

type SP = { status?: string; kind?: string; q?: string; page?: string };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<SP> }) {
    const sp = await searchParams;
    const page = Math.max(1, Number(sp.page) || 1);
    const { orders, total } = await searchOrders({ status: sp.status, kind: sp.kind, q: sp.q, page });
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const qs = (over: Partial<SP>) => {
        const p = new URLSearchParams();
        const merged = { ...sp, ...over };
        for (const [k, v] of Object.entries(merged)) if (v && v !== 'all') p.set(k, String(v));
        const s = p.toString();
        return s ? `?${s}` : '';
    };

    return (
        <>
            <h1 className="adm-h1">주문</h1>
            <form className="adm-filters" method="get">
                <select name="status" defaultValue={sp.status ?? 'all'} aria-label="상태">
                    <option value="all">전체 상태</option>
                    {Object.entries(ORDER_STATUS_LABEL)
                        .filter(([k]) => k !== 'pending')
                        .map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                </select>
                <select name="kind" defaultValue={sp.kind ?? 'all'} aria-label="유형">
                    <option value="all">일반+정기</option>
                    <option value="once">일반 구매</option>
                    <option value="subscription">정기구독</option>
                </select>
                <input name="q" defaultValue={sp.q ?? ''} placeholder="주문번호·이름·연락처·운송장" aria-label="검색" />
                <button type="submit" className="adm-btn adm-btn--primary">
                    검색
                </button>
            </form>

            <p className="adm-muted">총 {total}건</p>
            {orders.length === 0 ? (
                <section className="adm-card">
                    <p className="adm-muted">조건에 맞는 주문이 없어요</p>
                </section>
            ) : (
                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr>
                                <th>주문번호</th>
                                <th>일시</th>
                                <th>받는 분</th>
                                <th>상품</th>
                                <th>유형</th>
                                <th>상태</th>
                                <th className="r">금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => (
                                <tr key={o.id}>
                                    <td>
                                        <Link href={`/admin/orders/${o.orderNo}`}>{o.orderNo}</Link>
                                    </td>
                                    <td>{dt(o.paidAt ?? o.createdAt)}</td>
                                    <td>{o.shipName}</td>
                                    <td>
                                        {o.items[0]?.name}
                                        {o.items.length > 1 ? ` 외 ${o.items.length - 1}` : ''}
                                    </td>
                                    <td>{o.kind === 'subscription' ? '정기' : '일반'}</td>
                                    <td>
                                        <span className={`ord-status ord-status--${o.status}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                                    </td>
                                    <td className="r">{won(o.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {pages > 1 ? (
                <div className="adm-pager">
                    {page > 1 ? <Link href={`/admin/orders${qs({ page: String(page - 1) })}`}>← 이전</Link> : <span />}
                    <span>
                        {page} / {pages}
                    </span>
                    {page < pages ? <Link href={`/admin/orders${qs({ page: String(page + 1) })}`}>다음 →</Link> : <span />}
                </div>
            ) : null}
        </>
    );
}
