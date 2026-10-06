import { searchSubscriptions } from '../../../lib/admin-data';
import { SUB_STATUS_LABEL } from '../../../lib/subscription-types';
import { priceCart } from '../../../lib/catalog';
import { AdminSubActions } from '../../../components/admin/AdminActions';
import { dt, won } from '../../../components/admin/format';

export const runtime = 'edge';

export default async function AdminSubscriptions({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
    const { status } = await searchParams;
    const subs = await searchSubscriptions(status);

    return (
        <>
            <h1 className="adm-h1">구독</h1>
            <form className="adm-filters" method="get">
                <select name="status" defaultValue={status ?? 'all'} aria-label="상태">
                    <option value="all">전체</option>
                    {Object.entries(SUB_STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
                <button type="submit" className="adm-btn adm-btn--primary">
                    조회
                </button>
            </form>

            <p className="adm-muted">{subs.length}건</p>
            {subs.length === 0 ? (
                <section className="adm-card">
                    <p className="adm-muted">구독이 없어요</p>
                </section>
            ) : (
                subs.map((s) => {
                    const priced = priceCart(s.lines, 'subscribe');
                    return (
                        <section key={s.id} className={`adm-card adm-sub${s.status === 'canceled' ? ' is-canceled' : ''}`}>
                            <div className="adm-sub__head">
                                <div>
                                    <strong>
                                        {s.userName ?? s.shipName ?? '구독자'} {s.userEmail ? <span className="adm-muted">({s.userEmail})</span> : null}
                                    </strong>
                                    <div className="adm-muted">
                                        {priced.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}
                                    </div>
                                </div>
                                <span className={`sub-status sub-status--${s.status}`}>{SUB_STATUS_LABEL[s.status]}</span>
                            </div>
                            <dl className="adm-dl adm-dl--inline">
                                <div>
                                    <dt>회당 금액</dt>
                                    <dd>{won(priced.total)}</dd>
                                </div>
                                <div>
                                    <dt>주기</dt>
                                    <dd>{s.cycleDays}일</dd>
                                </div>
                                <div>
                                    <dt>다음 결제일</dt>
                                    <dd>
                                        {s.nextBillingDate}
                                        {s.skipNext ? ' (건너뛰기 예정)' : ''}
                                    </dd>
                                </div>
                                <div>
                                    <dt>실패 횟수</dt>
                                    <dd>{s.failCount}</dd>
                                </div>
                                <div>
                                    <dt>배송지</dt>
                                    <dd>
                                        {s.shipName} · {s.shipAddress1}
                                    </dd>
                                </div>
                            </dl>
                            {s.attempts.length > 0 ? (
                                <details className="adm-details">
                                    <summary>최근 결제 시도 ({s.attempts.length})</summary>
                                    <ul>
                                        {s.attempts.map((a, i) => (
                                            <li key={i} className={a.ok ? '' : 'adm-error'}>
                                                {dt(a.at)} · {a.ok ? '성공' : `실패 ${a.errorCode ?? ''} ${a.errorMessage ?? ''}`}
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            ) : null}
                            <AdminSubActions id={s.id} status={s.status} failCount={s.failCount} nextDate={s.nextBillingDate} />
                        </section>
                    );
                })
            )}
        </>
    );
}
