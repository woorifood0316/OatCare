import { channelConfig, recentNotifications } from '../../../lib/admin-data';
import { AdminCronButtons } from '../../../components/admin/AdminActions';
import { dt } from '../../../components/admin/format';

export const runtime = 'edge';

const STATUS_KO: Record<string, string> = { pending: '대기', sent: '발송됨', skipped: '건너뜀', failed: '실패' };
const CHANNEL_KO: Record<string, string> = { email: '고객 이메일', admin: '운영자 알림' };

export default async function AdminNotifications() {
    const rows = await recentNotifications();
    const cfg = channelConfig();

    return (
        <>
            <h1 className="adm-h1">알림</h1>

            <section className="adm-card">
                <h2>채널 연결 상태</h2>
                <ul className="adm-config">
                    <li className={cfg.adminWebhook ? 'is-on' : ''}>운영자 웹훅(슬랙·디스코드 등): {cfg.adminWebhook ? '연결됨' : '미설정 (ADMIN_WEBHOOK_URL)'}</li>
                    <li className={cfg.telegram ? 'is-on' : ''}>운영자 텔레그램: {cfg.telegram ? '연결됨' : '미설정 (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)'}</li>
                    <li className={cfg.email ? 'is-on' : ''}>고객 이메일(Resend): {cfg.email ? '연결됨' : '미설정 (RESEND_API_KEY, EMAIL_FROM)'}</li>
                    <li>고객 카카오 알림톡: 준비 중 (발송 대행사 계약 후 같은 대기열에 연결)</li>
                </ul>
                <p className="adm-muted">설정되지 않은 채널의 알림은 &apos;건너뜀&apos;으로 기록돼요.</p>
            </section>

            <AdminCronButtons />

            <h2 className="adm-h2">최근 알림 {rows.length}건</h2>
            <div className="adm-table-wrap">
                <table className="adm-table">
                    <thead>
                        <tr>
                            <th>일시</th>
                            <th>채널</th>
                            <th>이벤트</th>
                            <th>대상</th>
                            <th>상태</th>
                            <th>오류</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((n) => (
                            <tr key={n.id}>
                                <td>{dt(n.createdAt)}</td>
                                <td>{CHANNEL_KO[n.channel] ?? n.channel}</td>
                                <td>{n.event}</td>
                                <td>{n.userName ?? '-'}</td>
                                <td>{STATUS_KO[n.status] ?? n.status}</td>
                                <td className="adm-break">{n.error ?? ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
