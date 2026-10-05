import type { Metadata } from 'next';
import { AuthCard } from '../../components/AuthCard';

export const metadata: Metadata = {
    title: '로그인 | OatCare 오트케어',
    robots: { index: false, follow: false },
    alternates: { canonical: '/login' },
};

export default function LoginPage() {
    return <AuthCard mode="login" />;
}
