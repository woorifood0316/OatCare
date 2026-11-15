import { PromoPush } from '../../../components/admin/PromoPush';

export const runtime = 'edge';

export default function AdminPush() {
    return (
        <>
            <h1 className="adm-h1">이벤트 알림</h1>
            <p className="adm-muted" style={{ marginTop: '-0.5rem', marginBottom: '0.9rem' }}>
                쿠폰 만료, 새 맛, 할인 소식을 앱 알림으로 보내요. 이벤트·혜택 알림에 동의하고 앱 알림을 켠 회원에게만 가고, (광고) 표시와 수신 거부 안내가 자동으로 붙어요.
            </p>
            <PromoPush />
        </>
    );
}
