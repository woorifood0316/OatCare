import NextAuth, { CredentialsSignin } from 'next-auth';
import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';
import Credentials from 'next-auth/providers/credentials';
import { cookies } from 'next/headers';
import { getSql } from './lib/db';
import { issueWelcomeCoupon } from './lib/coupons';
import { verifyTestLogin } from './lib/test-login';
import { KakaoLoginError, exchangeKakaoCode, mapKakaoUser } from './lib/kakao-app';
import { PENDING_COOKIE, openPending, pendingCookieOptions, sealPending } from './lib/pending-signup';

/** Kakao app-login failure with the reason in `code` (shown on /login so a failed try tells us why). */
class KakaoSignin extends CredentialsSignin {
    constructor(reason: string) {
        super(reason);
        this.code = reason;
    }
}


// Credentials are read automatically from AUTH_GOOGLE_*, AUTH_KAKAO_*, AUTH_NAVER_*.
export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        // Kakao: 닉네임(필수), 이메일(선택). 프로필 사진은 받지 않는다.
        Kakao({
            authorization: {
                url: 'https://kauth.kakao.com/oauth/authorize',
                params: { scope: 'profile_nickname account_email' },
            },
            profile(p) {
                const m = mapKakaoUser(p as Parameters<typeof mapKakaoUser>[0]);
                return { id: m.id, name: m.name, email: m.email, image: null };
            },
        }),
        // Kakao "간편로그인": the KakaoTalk app opens instead of the id/password page. The browser starts it with Kakao's
        // JavaScript SDK; /api/kakao/callback hands the code to this provider (same member as the regular Kakao login).
        Credentials({
            id: 'kakao-app',
            name: 'kakao-app',
            credentials: { code: {}, redirectUri: {} },
            async authorize(creds) {
                try {
                    const profile = await exchangeKakaoCode(String(creds?.code ?? ''), String(creds?.redirectUri ?? ''));
                    return { id: profile.id, name: profile.name, email: profile.email, image: null };
                } catch (e) {
                    const reason = e instanceof KakaoLoginError ? e.reason : 'unknown';
                    console.error('[kakao-app]', reason);
                    throw new KakaoSignin(reason);
                }
            },
        }),
        // Naver: 이름(필수), 이메일(선택). The stock provider only reads the nickname, so name stayed empty.
        Naver({
            profile(p) {
                const r = (p as { response?: { id: string; name?: string; nickname?: string; email?: string } }).response;
                return {
                    id: r?.id ?? '',
                    name: r?.name || r?.nickname || null,
                    email: r?.email ?? null,
                    image: null,
                };
            },
        }),
        Google,
        // Second half of the one-step sign-up: /welcome posts the visitor's consent here. The social profile comes from
        // the encrypted oc_pending cookie set in the signIn callback below, never from the browser.
        Credentials({
            id: 'signup',
            name: 'signup',
            credentials: { agreed: {}, marketing: {} },
            async authorize(creds) {
                if (creds?.agreed !== '1') return null;
                const jar = await cookies();
                const pending = await openPending(jar.get(PENDING_COOKIE)?.value);
                if (!pending) return null;
                const sql = getSql();
                // Already a member (e.g. the welcome page was submitted twice): just log in.
                const existing = await sql`
                    select user_id from accounts where provider = ${pending.provider} and provider_account_id = ${pending.providerAccountId}
                `;
                let userId: string;
                if (existing.length > 0) {
                    userId = existing[0].user_id as string;
                } else {
                    const created = await sql`
                        insert into users (name, email, terms_agreed_at, privacy_agreed_at, marketing_agreed, last_login_at)
                        values (${pending.name}, ${pending.email}, now(), now(), ${creds?.marketing === '1'}, now())
                        returning id
                    `;
                    userId = created[0].id as string;
                    await sql`
                        insert into accounts (user_id, provider, provider_account_id)
                        values (${userId}, ${pending.provider}, ${pending.providerAccountId})
                    `;
                    await issueWelcomeCoupon(userId);
                }
                jar.delete(PENDING_COOKIE);
                return { id: userId, name: pending.name, email: pending.email };
            },
        }),
        // TEMPORARY: test id/password login for the payment-provider review (see lib/test-login.ts).
        Credentials({
            id: 'review',
            name: 'review',
            credentials: { loginId: {}, password: {} },
            async authorize(creds) {
                const userId = await verifyTestLogin(String(creds?.loginId ?? ''), String(creds?.password ?? ''));
                if (!userId) return null;
                const sql = getSql();
                await sql`update users set last_login_at = now() where id = ${userId}`;
                return { id: userId, name: '테스트 회원' };
            },
        }),
    ],
    // Print the real cause of sign-in failures (the browser only shows "Configuration"). No secrets are logged.
    logger: {
        error(error) {
            const cause = (error as { cause?: { err?: unknown } }).cause?.err ?? (error as { cause?: unknown }).cause;
            console.error('[auth]', error.name, error.message, cause instanceof Error ? `${cause.name}: ${cause.message}` : (cause ?? ''));
        },
    },
    session: { strategy: 'jwt' },
    trustHost: true,
    pages: { signIn: '/login', error: '/login' },
    callbacks: {
        async signIn({ user, account }) {
            if (!account) return false;
            if (account.provider === 'review' || account.provider === 'signup') return true; // done in authorize()
            const provider = account.provider === 'kakao-app' ? 'kakao' : account.provider;
            const providerAccountId = account.providerAccountId;
            const sql = getSql();

            const existing = await sql`
                select user_id from accounts
                where provider = ${provider} and provider_account_id = ${providerAccountId}
            `;

            if (existing.length > 0) {
                const userId = existing[0].user_id as string;
                // Fill a missing name from the provider; never overwrite one that is already set.
                await sql`
                    update users
                    set last_login_at = now(), name = coalesce(nullif(name, ''), ${user.name ?? null})
                    where id = ${userId}
                `;
                user.id = userId;
                return true;
            }

            // New social account: no separate sign-up page. Keep its profile for 15 minutes and show the one-tap
            // consent screen; /welcome then creates the member and logs them in.
            const jar = await cookies();
            jar.set(
                PENDING_COOKIE,
                await sealPending({ provider, providerAccountId, name: user.name ?? null, email: user.email ?? null }),
                pendingCookieOptions,
            );
            return '/welcome';
        },
        async jwt({ token, user }) {
            if (user?.id) token.uid = user.id;
            return token;
        },
        async session({ session, token }) {
            if (token.uid && session.user) {
                session.user.id = token.uid as string;
            }
            return session;
        },
    },
});
