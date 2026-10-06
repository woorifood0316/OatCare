import { searchMembers } from '../../../lib/admin-data';
import { day, PROVIDER_KO } from '../../../components/admin/format';

export const runtime = 'edge';

export default async function AdminMembers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const { q } = await searchParams;
    const members = await searchMembers(q);

    return (
        <>
            <h1 className="adm-h1">회원</h1>
            <form className="adm-filters" method="get">
                <input name="q" defaultValue={q ?? ''} placeholder="이름 또는 이메일" aria-label="검색" />
                <button type="submit" className="adm-btn adm-btn--primary">
                    검색
                </button>
            </form>
            <p className="adm-muted">최근 가입순 {members.length}명 · 개인정보 보호를 위해 최소한의 항목만 표시해요</p>
            <div className="adm-table-wrap">
                <table className="adm-table">
                    <thead>
                        <tr>
                            <th>이름</th>
                            <th>이메일</th>
                            <th>가입 방법</th>
                            <th>가입일</th>
                            <th className="r">주문</th>
                            <th className="r">구독</th>
                            <th>마케팅</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((m) => (
                            <tr key={m.id}>
                                <td>
                                    {m.name ?? '-'} {m.role === 'admin' ? <span className="my-pill is-on">관리자</span> : null}
                                </td>
                                <td>{m.email ?? '-'}</td>
                                <td>{m.providers.map((p) => PROVIDER_KO[p] ?? p).join(', ')}</td>
                                <td>{day(m.createdAt)}</td>
                                <td className="r">{m.orderCount}</td>
                                <td className="r">{m.activeSubs}</td>
                                <td>{m.marketingAgreed ? '동의' : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
