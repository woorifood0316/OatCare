import Link from 'next/link';
import { ACCESS_LOG_YEARS, listAccessLog, type AccessOutcome } from '../../../lib/access-log';

export const runtime = 'edge';

const OUTCOME: Record<AccessOutcome, { label: string; tone: string }> = {
    allowed: { label: '관리자 접속', tone: '' },
    anonymous: { label: '차단 · 비로그인', tone: 'is-warn' },
    not_admin: { label: '차단 · 관리자 아님', tone: 'is-warn' },
    idle: { label: '재로그인 요청 · 12시간 미사용', tone: '' },
};

const when = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

/** 관리자 화면 접속 기록: who opened which admin page or admin API, and every refused attempt. */
export default async function AdminAccessLog({ searchParams }: { searchParams: Promise<{ only?: string }> }) {
    const { only } = await searchParams;
    const refusedOnly = only === 'refused';
    const rows = await listAccessLog(refusedOnly).catch(() => null);

    return (
        <>
            <h1 className="adm-h1">접속 기록</h1>
            <p className="adm-muted" style={{ marginTop: '-0.5rem', marginBottom: '0.9rem' }}>
                관리자 화면과 관리자 API에 들어온 모든 요청이에요. 로그인하지 않았거나 관리자가 아닌 사람의 시도는 막고 기록만 남겨요. 기록은 {ACCESS_LOG_YEARS}년
                보관해요 (개인정보 접속기록 보관). 한 달에 한 번 &lsquo;차단된 시도만&rsquo;을 열어 낯선 IP가 반복해서 들어왔는지 확인해 주세요.
            </p>
            <div className="adm-filters">
                <Link href="/admin/access-log" className={`adm-btn${refusedOnly ? '' : ' adm-btn--primary'}`}>
                    전체
                </Link>
                <Link href="/admin/access-log?only=refused" className={`adm-btn${refusedOnly ? ' adm-btn--primary' : ''}`}>
                    차단된 시도만
                </Link>
            </div>
            {rows === null ? (
                <p className="adm-muted">접속 기록 표가 아직 없어요 (db/access-log.sql 실행 필요).</p>
            ) : rows.length === 0 ? (
                <p className="adm-muted">기록이 없어요.</p>
            ) : (
                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr>
                                <th>시각</th>
                                <th>결과</th>
                                <th>회원</th>
                                <th>IP · 국가</th>
                                <th>요청</th>
                                <th>브라우저</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id}>
                                    <td>{when(r.at)}</td>
                                    <td>
                                        <span className={`my-pill ${OUTCOME[r.outcome]?.tone ?? ''}`}>{OUTCOME[r.outcome]?.label ?? r.outcome}</span>
                                    </td>
                                    <td>{r.userName ?? '-'}</td>
                                    <td>
                                        {r.ip ?? '-'}
                                        {r.country ? ` · ${r.country}` : ''}
                                    </td>
                                    <td>
                                        {r.method} {r.path}
                                    </td>
                                    <td className="adm-muted" style={{ maxWidth: '16rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.userAgent ?? ''}>
                                        {r.userAgent ?? '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
