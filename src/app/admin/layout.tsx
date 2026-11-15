import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '../../auth';
import { ADMIN_SEEN_COOKIE, adminActive } from '../../lib/admin-idle';
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
    // The same checks run first in src/middleware.ts (before anything renders); these stay as a second line.
    // Unused for 12 hours: confirm with the social login again before showing customer data.
    const session = await auth();
    const jar = await cookies();
    if (!(await adminActive(user.id, session?.authAt, jar.get(ADMIN_SEEN_COOKIE)?.value))) redirect('/reauth');
    return <AdminShell name={user.name}>{children}</AdminShell>;
}
