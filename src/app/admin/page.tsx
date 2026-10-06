import Link from 'next/link';
import { dashboardStats } from '../../lib/admin-data';
import { ORDER_STATUS_LABEL } from '../../lib/order-status';
import { SUB_STATUS_LABEL } from '../../lib/subscription-types';
import { AdminCronButtons } from '../../components/admin/AdminActions';
import { dt, won } from '../../components/admin/format';

export const runtime = 'edge';

export default async function AdminDashboard() {
    const s = await dashboardStats();

    const stats = [
        { label: '오늘 주문', value: `${s.todayOrders}건`, sub: won(s.todaySales), href: '/admin/orders' },
        { label: '이번 달 매출', value: won(s.monthSales), sub: '', href: '/admin/orders' },
        { label: '발송 대기', value: `${s.needsShipping}건`, sub: '결제완료·준비중', href: '/admin/orders?status=paid', alert: s.needsShipping > 0 },
        { label: '이용 중 구독', value: `${s.activeSubs}건`, sub: `오늘 결제 대상 ${s.dueToday}건`, href: '/admin/subscriptions' },
        { label: '최근 7일 결제 실패', value: `${s.failedCharges7d}건`, sub: '', href: '/admin/subscriptions?status=past_due', alert: s.failedCharges7d > 0 },
        { label: '발송 대기 알림', value: `${s.pendingNotifications}건`, sub: '', href: '/admin/notifications' },
    ];

    return (
        <>
            <h1 className="adm-h1">대시보드</h1>
            <div className="adm-stats">
                {stats.map((x) => (
                    <Link key={x.label} href={x.href} className={`adm-stat${x.alert ? ' is-alert' : ''}`}>
                        <span>{x.label}</span>
                        <strong>{x.value}</strong>
                        {x.sub ? <em>{x.sub}</em> : null}
                    </Link>
                ))}
            </div>

            <div className="adm-cols">
                <section className="adm-card">
                    <h2>최근 주문</h2>
                    {s.recentOrders.length === 0 ? (
                        <p className="adm-muted">아직 주문이 없어요</p>
                    ) : (
                        <ul className="adm-list">
                            {s.recentOrders.map((o) => (
                                <li key={o.id}>
                                    <Link href={`/admin/orders/${o.orderNo}`}>
                                        <b>{o.orderNo}</b>
                                        <span>
                                            {o.shipName} · {o.items[0]?.name}
                                            {o.items.length > 1 ? ` 외 ${o.items.length - 1}` : ''}
                                        </span>
                                        <span className={`ord-status ord-status--${o.status}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                                        <b>{won(o.amount)}</b>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="adm-card">
                    <h2>확인이 필요한 구독</h2>
                    {s.troubleSubs.length === 0 ? (
                        <p className="adm-muted">결제 문제가 있는 구독이 없어요 👍</p>
                    ) : (
                        <ul className="adm-list">
                            {s.troubleSubs.map((x) => (
                                <li key={x.id}>
                                    <Link href="/admin/subscriptions?status=past_due">
                                        <b>{x.shipName ?? '구독자'}</b>
                                        <span>
                                            {SUB_STATUS_LABEL[x.status]} · 실패 {x.failCount}회
                                        </span>
                                        <span>{dt(x.lastBilledAt)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <AdminCronButtons />
        </>
    );
}
