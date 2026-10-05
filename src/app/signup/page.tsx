import type { Metadata } from 'next';
import { AuthCard } from '../../components/AuthCard';

export const metadata: Metadata = {
    title: '3초 회원가입 | 참오트케어',
    robots: { index: false, follow: false },
    alternates: { canonical: '/signup' },
};

export default function SignupPage() {
    return <AuthCard mode="signup" />;
}
