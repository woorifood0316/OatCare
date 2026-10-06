import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '../../lib/current-user';
import { AdminShell } from '../../components/admin/AdminShell';

export const runtime = 'edge';

export const metadata: Metadata = {
    title: '운영 | 참오트케어',
    robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser('/admin');
    // Not an admin: behave as if the page does not exist.
    if (user.role !== 'admin') notFound();
    return <AdminShell name={user.name}>{children}</AdminShell>;
}
