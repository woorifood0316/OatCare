import { channelConfig } from '../../../lib/admin-data';
import { EVENT_LABEL, TEST_KINDS, searchNotifications } from '../../../lib/admin-notifications';
import { requireAdmin } from '../../../lib/api';
import { getSql } from '../../../lib/db';
import { AdminCronButtons } from '../../../components/admin/AdminActions';
import { NotificationTable, TestMailBox } from '../../../components/admin/NotificationTools';

export const runtime = 'edge';

type SP = { channel?: string; status?: string; event?: string; q?: string; from?: string; to?: string };

export default async function AdminNotifications({ searchParams }: { searchParams: Promise<SP> }) {
    const f = await searchParams;
    const rows = await searchNotifications(f);
    const cfg = channelConfig();
    const admin = await requireAdmin();
    const me = admin ? (await getSql()`select email from users where id = ${admin.id}`)[0] : undefined;
    const filtered = Boolean(f.channel || f.status || f.event || f.q || f.from || f.to);

    return (
        <>
            <h1 className="adm-h1">알림</h1>

            <section className="adm-card">
                <h2>채널 연결 상태</h2>
                <ul className="adm-config">
                    <li className={cfg.adminWebhook ? 'is-on' : ''}>운영자 웹훅(슬랙·디스코드 등): {cfg.adminWebhook ? '연결됨' : '미설정 (ADMIN_WEBHOOK_URL)'}</li>
                    <li className={cfg.telegram ? 'is-on' : ''}>운영자 텔레그램: {cfg.telegram ? '연결됨' : '미설정 (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)'}</li>
                    <li className={cfg.email ? 'is-on' : ''}>고객 이메일(Brevo): {cfg.email ? '연결됨' : '미설정 (BREVO_API_KEY, EMAIL_FROM)'}</li>
                    <li>고객 카카오 알림톡: 준비 중 (발송 대행사 계약 후 같은 대기열에 연결)</li>
                </ul>
                <p className="adm-muted">설정되지 않은 채널의 알림은 &apos;건너뜀&apos;으로 기록돼요.</p>
            </section>

            <section className="adm-card">
                <h2>테스트 메일</h2>
                <p className="adm-muted">고객에게 가는 메일이 어떻게 보이는지 이 주소로만 보내 봐요. 주문 메일은 가장 최근 주문 내용으로 만들어져요. 고객에게는 아무것도 가지 않아요.</p>
                <TestMailBox defaultTo={(me?.email as string | undefined) ?? ''} kinds={TEST_KINDS.map((k) => ({ id: k, label: EVENT_LABEL[k] ?? k }))} />
            </section>

            <AdminCronButtons />

            <h2 className="adm-h2">알림 내역 {rows.length}건{filtered ? ' (필터 적용)' : ''}</h2>
            <form className="adm-filters" method="get">
                <select name="channel" defaultValue={f.channel ?? ''} aria-label="채널">
                    <option value="">채널 전체</option>
                    <option value="email">고객 이메일</option>
                    <option value="admin">운영자 알림</option>
                </select>
                <select name="event" defaultValue={f.event ?? ''} aria-label="내용">
                    <option value="">내용 전체</option>
                    {Object.entries(EVENT_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
                <select name="status" defaultValue={f.status ?? ''} aria-label="상태">
                    <option value="">상태 전체</option>
                    <option value="sent">발송됨</option>
                    <option value="skipped">건너뜀</option>
                    <option value="failed">실패</option>
                    <option value="pending">대기</option>
                </select>
                <input type="date" name="from" defaultValue={f.from ?? ''} aria-label="시작일" />
                <input type="date" name="to" defaultValue={f.to ?? ''} aria-label="종료일" />
                <input name="q" defaultValue={f.q ?? ''} placeholder="회원 이름·이메일" aria-label="회원 검색" />
                <button type="submit" className="adm-btn adm-btn--primary">
                    검색
                </button>
                {filtered ? (
                    <a href="/admin/notifications" className="adm-btn">
                        초기화
                    </a>
                ) : null}
            </form>
            <NotificationTable rows={rows.map((r) => ({ ...r, eventLabel: EVENT_LABEL[r.event] ?? r.event }))} />
        </>
    );
}
