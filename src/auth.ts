import NextAuth, { CredentialsSignin } from 'next-auth';
import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';
import Credentials from 'next-auth/providers/credentials';
import { cookies } from 'next/headers';
import { getSql } from './lib/db';
import { issueWelcomeCoupon } from './lib/coupons';
import { setMarketingConsent } from './lib/consent';
import { isBannedAccount } from './lib/reviews';
import { KakaoLoginError, exchangeKakaoCode, mapKakaoUser } from './lib/kakao-app';
import { PENDING_COOKIE, openPending, pendingCookieOptions, sealPending } from './lib/pending-signup';
import { REF_COOKIE, recordReferral } from './lib/referrals';
import { consumeHandoff } from './lib/handoff';
import { existingLoginFor } from './lib/existing-login';

/** Logins last this long and are renewed whenever the member comes back ("모든 기기에서 로그아웃" ends them early). */
const SESSION_DAYS = 180;

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
                        values (${pending.name}, ${pending.email}, now(), now(), false, now())
                        returning id
                    `;
                    userId = created[0].id as string;
                    await sql`
                        insert into accounts (user_id, provider, provider_account_id, email)
                        values (${userId}, ${pending.provider}, ${pending.providerAccountId}, ${pending.email})
                    `;
                    await issueWelcomeCoupon(userId);
                    if (creds?.marketing === '1') {
                        try {
                            await setMarketingConsent(userId, true, 'signup');
                        } catch (e) {
                            console.error('[signup] marketing consent failed', e);
                        }
                    }
                    // Came through a member's invitation link: record the invitation (coupons follow the first confirmed order).
                    await recordReferral(userId, jar.get(REF_COOKIE)?.value);
                    jar.delete(REF_COOKIE);
                }
                jar.delete(PENDING_COOKIE);
                return { id: userId, name: pending.name, email: pending.email };
            },
        }),
        // Moving from an app's built-in browser to Chrome / Safari (to add the site to the home screen): a one-time
        // token from /api/account/handoff logs the same member in there (lib/handoff.ts).
        Credentials({
            id: 'handoff',
            name: 'handoff',
            credentials: { token: {} },
            async authorize(creds) {
                return consumeHandoff(String(creds?.token ?? ''));
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
    session: { strategy: 'jwt', maxAge: SESSION_DAYS * 24 * 60 * 60 },
    trustHost: true,
    pages: { signIn: '/login', error: '/login' },
    callbacks: {
        async signIn({ user, account }) {
            if (!account) return false;
            if (account.provider === 'signup' || account.provider === 'handoff') return true; // done in authorize()
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
                // the email this login gives, kept for pointing a later second sign-up to this login
                if (user.email) await sql`update accounts set email = ${user.email} where provider = ${provider} and provider_account_id = ${providerAccountId} and email is null`;
                user.id = userId;
                return true;
            }

            // Expelled for breaking the review policy: the same social login cannot sign up again.
            if (await isBannedAccount(provider, providerAccountId)) return '/login?error=banned';

            // Already a member through another social login with the same email: log in that way instead of a second account.
            const via = await existingLoginFor(user.email);
            if (via && via !== provider) return `/login?error=exists&via=${via}`;

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
            const sql = getSql();
            if (user?.id) {
                token.uid = user.id;
                token.authAt = Date.now();
                const r = await sql`select session_version from users where id = ${user.id}`;
                token.sv = (r[0]?.session_version as number | undefined) ?? 0;
                return token;
            }
            if (token.uid) {
                // "모든 기기에서 로그아웃" or a withdrawn account: this login is over (a DB hiccup keeps it).
                try {
                    const r = await sql`select session_version from users where id = ${token.uid}`;
                    if (!r[0] || ((r[0].session_version as number) ?? 0) !== (token.sv ?? 0)) return null;
                } catch (e) {
                    console.error('[auth] session check failed', e);
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token.uid && session.user) {
                session.user.id = token.uid as string;
            }
            session.authAt = token.authAt;
            return session;
        },
    },
});
