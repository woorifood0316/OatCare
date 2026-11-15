import type { Metadata } from 'next';
import { AdminReauth } from '../../components/admin/AdminReauth';

export const runtime = 'edge';

export const metadata: Metadata = {
    title: '다시 로그인 | 참오트케어',
    robots: { index: false, follow: false },
};

/** Where the admin pages send an admin after 12 hours without use (src/middleware.ts). */
export default function ReauthPage() {
    return <AdminReauth />;
}
