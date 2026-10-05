import type { Metadata } from 'next';
import { getCurrentUser } from '../../lib/current-user';
import { MyShell } from '../../components/mypage/MyShell';

export const runtime = 'edge';

export const metadata: Metadata = {
    title: '마이페이지 | 참오트케어',
    robots: { index: false, follow: false },
};

export default async function MyPageLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();

    return (
        <MyShell name={user.name} email={user.email} isAdmin={user.role === 'admin'}>
            {children}
        </MyShell>
    );
}
