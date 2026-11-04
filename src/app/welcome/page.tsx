import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AFTER_COOKIE, PENDING_COOKIE, PROVIDER_KO, openPending } from '../../lib/pending-signup';
import { safeCallbackPath } from '../../lib/safe-redirect';
import { WelcomeConsent } from '../../components/WelcomeConsent';

export const runtime = 'edge';

export const metadata: Metadata = {
    title: '환영해요 | 참오트케어',
    robots: { index: false, follow: false },
};

/** One-tap consent for a first-time social account (see lib/pending-signup.ts). */
export default async function WelcomePage() {
    const jar = await cookies();
    const pending = await openPending(jar.get(PENDING_COOKIE)?.value);
    if (!pending) redirect('/login?error=SignupExpired');
    const after = jar.get(AFTER_COOKIE)?.value;
    const next = safeCallbackPath(after ? decodeURIComponent(after) : '/');
    return <WelcomeConsent name={pending.name} provider={PROVIDER_KO[pending.provider] ?? pending.provider} next={next} />;
}
