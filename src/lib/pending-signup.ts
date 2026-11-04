// One flow for sign-up and log-in: a social account we have never seen is not turned away. Auth.js hands us its
// profile, we keep it for 15 minutes in an encrypted, http-only cookie and send the visitor to /welcome, where one
// "동의하고 시작하기" tap creates the member and logs them in (the 'signup' Credentials provider in auth.ts).
import { encode, decode } from 'next-auth/jwt';

export const PENDING_COOKIE = 'oc_pending';
/** Where to go after the welcome step (set by the login card before leaving for Kakao/Naver/Google). */
export const AFTER_COOKIE = 'oc_after';
const MAX_AGE = 15 * 60;

export interface PendingSignup {
    provider: string; // 'kakao' | 'naver' | 'google'
    providerAccountId: string;
    name: string | null;
    email: string | null;
}

function secret(): string {
    const s = process.env.AUTH_SECRET;
    if (!s) throw new Error('AUTH_SECRET is not set');
    return s;
}

export async function sealPending(p: PendingSignup): Promise<string> {
    return encode({ token: { ...p }, secret: secret(), salt: PENDING_COOKIE, maxAge: MAX_AGE });
}

export async function openPending(value: string | undefined): Promise<PendingSignup | null> {
    if (!value) return null;
    try {
        const t = (await decode({ token: value, secret: secret(), salt: PENDING_COOKIE })) as Record<string, unknown> | null;
        if (!t || typeof t.provider !== 'string' || typeof t.providerAccountId !== 'string') return null;
        return {
            provider: t.provider,
            providerAccountId: t.providerAccountId,
            name: typeof t.name === 'string' ? t.name : null,
            email: typeof t.email === 'string' ? t.email : null,
        };
    } catch {
        return null;
    }
}

export const pendingCookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
};

export const PROVIDER_KO: Record<string, string> = { kakao: '카카오', naver: '네이버', google: '구글' };
