import type { Metadata } from 'next';
import { AuthCard } from '../../components/AuthCard';

export const metadata: Metadata = {
    title: '시작하기 | 참오트케어',
    robots: { index: false, follow: false },
    alternates: { canonical: '/signup' },
};

export default function SignupPage() {
    return <AuthCard mode="signup" />;
}
