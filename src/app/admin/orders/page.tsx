import Link from 'next/link';
import { PAGE_SIZE, searchOrders, statusList } from '../../../lib/admin-data';
import { CATALOG } from '../../../lib/catalog';
import { OrderColumnHead } from '../../../components/admin/OrderColumnHead';
import { ORDER_STATUS_LABEL } from '../../../lib/order-status';
import { dt, won } from '../../../components/admin/format';
import { ShippingExcelTools } from '../../../components/admin/ShippingExcelTools';

export const runtime = 'edge';

type SP = {
    status?: string;
    kind?: string;
    q?: string;
    no?: string;
    name?: string;
    from?: string;
    to?: string;
    product?: string;
    min?: string;
    max?: string;
    sort?: string;
    dir?: string;
    page?: string;
};
const FILTER_KEYS = ['q', 'no', 'name', 'from', 'to', 'product', 'kind', 'status', 'min', 'max'] as const;
const STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABEL)
    .filter(([k]) => k !== 'pending')
    .map(([value, label]) => ({ value, label }));
const PRODUCT_OPTIONS = CATALOG.map((i) => ({ value: i.sku, label: i.name }));
const KIND_OPTIONS = [
    { value: 'once', label: '일반 구매' },
    { value: 'subscription', label: '정기구독' },
];
const comma = (v: string) => Number(v).toLocaleString('ko-KR');

export default async function AdminOrders({ searchParams }: { searchParams: Promise<SP> }) {
    const sp = await searchParams;
    const page = Math.max(1, Number(sp.page) || 1);
    const { orders, total } = await searchOrders({ ...sp, page });
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const qs = (over: Partial<Record<keyof SP, string | undefined>>) => {
        const p = new URLSearchParams();
        const merged: Record<string, string | undefined> = { ...sp, ...over };
        if (!('page' in over)) delete merged.page;
        for (const [k, v] of Object.entries(merged)) if (v && v !== 'all') p.set(k, String(v));
        const s = p.toString();
        return s ? `?${s}` : '';
    };

    const statusNames = statusList(sp.status).map((x) => ORDER_STATUS_LABEL[x as keyof typeof ORDER_STATUS_LABEL] ?? x);
    const chips: { key: string; label: string; params: (keyof SP)[] }[] = [];
    if (sp.q) chips.push({ key: 'q', label: `검색: ${sp.q}`, params: ['q'] });
    if (sp.no) chips.push({ key: 'no', label: `주문번호: ${sp.no}`, params: ['no'] });
    if (sp.from || sp.to) chips.push({ key: 'date', label: `일시: ${sp.from ?? '처음'} ~ ${sp.to ?? '오늘'}`, params: ['from', 'to'] });
    if (sp.name) chips.push({ key: 'name', label: `받는 분: ${sp.name}`, params: ['name'] });
    if (sp.product) chips.push({ key: 'product', label: `상품: ${PRODUCT_OPTIONS.find((o) => o.value === sp.product)?.label ?? sp.product}`, params: ['product'] });
    if (sp.kind && sp.kind !== 'all') chips.push({ key: 'kind', label: `유형: ${sp.kind === 'subscription' ? '정기' : '일반'}`, params: ['kind'] });
    if (statusNames.length) chips.push({ key: 'status', label: `상태: ${statusNames.join('·')}`, params: ['status'] });
    if (sp.min || sp.max)
        chips.push({ key: 'amount', label: `금액: ${sp.min ? `${comma(sp.min)}원` : '0원'} ~ ${sp.max ? `${comma(sp.max)}원` : ''}`, params: ['min', 'max'] });

    return (
        <>
            <h1 className="adm-h1">주문</h1>
            <form className="adm-filters" method="get">
                {/* keep the column filters and sort when searching */}
                {Object.entries(sp)
                    .filter(([k, v]) => v && k !== 'q' && k !== 'page')
                    .map(([k, v]) => (
                        <input key={k} type="hidden" name={k} value={String(v)} />
                    ))}
                <input name="q" defaultValue={sp.q ?? ''} placeholder="주문번호·이름·연락처·운송장 통합 검색" aria-label="검색" />
                <button type="submit" className="adm-btn adm-btn--primary">
                    검색
                </button>
            </form>

            {chips.length ? (
                <div className="och-chips">
                    {chips.map((c) => (
                        <Link key={c.key} href={`/admin/orders${qs(Object.fromEntries(c.params.map((k) => [k, undefined])))}`} className="och-chip">
                            {c.label} <span aria-hidden="true">×</span>
                        </Link>
                    ))}
                    <Link href={`/admin/orders${qs(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])))}`} className="och-chip och-chip--clear">
                        필터 모두 지우기
                    </Link>
                </div>
            ) : null}

            <ShippingExcelTools
                filter={{ status: sp.status, kind: sp.kind, q: sp.q, no: sp.no, name: sp.name, from: sp.from, to: sp.to, product: sp.product, min: sp.min, max: sp.max }}
            />

            <p className="adm-muted">총 {total}건</p>
            {
                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr>
                                <th>
                                    <input type="checkbox" id="adm-sel-all" aria-label="전체 선택" />
                                </th>
                                <OrderColumnHead col="no" label="주문번호" />
                                <OrderColumnHead col="date" label="일시" />
                                <OrderColumnHead col="name" label="받는 분" />
                                <OrderColumnHead col="product" label="상품" options={PRODUCT_OPTIONS} />
                                <OrderColumnHead col="kind" label="유형" options={KIND_OPTIONS} />
                                <OrderColumnHead col="status" label="상태" options={STATUS_OPTIONS} />
                                <OrderColumnHead col="amount" label="금액" align="right" />
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="och-empty">
                                        조건에 맞는 주문이 없어요. 위의 필터를 지우거나 바꿔 보세요.
                                    </td>
                                </tr>
                            ) : null}
                            {orders.map((o) => (
                                <tr key={o.id}>
                                    <td>
                                        <input type="checkbox" className="adm-sel" data-order={o.orderNo} aria-label={`${o.orderNo} 선택`} />
                                    </td>
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
            }

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
