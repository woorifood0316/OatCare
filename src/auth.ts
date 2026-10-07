import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';
import Credentials from 'next-auth/providers/credentials';
import { cookies } from 'next/headers';
import { getSql } from './lib/db';
import { issueWelcomeCoupon } from './lib/coupons';
import { verifyTestLogin } from './lib/test-login';

export const CONSENT_COOKIE = 'oc_consent';
export const MARKETING_COOKIE = 'oc_mkt';

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
                const account = p.kakao_account as
                    | {
                          email?: string;
                          is_email_valid?: boolean;
                          is_email_verified?: boolean;
                          profile?: { nickname?: string };
                      }
                    | undefined;
                const emailOk = account?.is_email_valid && account?.is_email_verified;
                return {
                    id: String(p.id),
                    name: account?.profile?.nickname ?? null,
                    email: emailOk ? (account?.email ?? null) : null,
                    image: null,
                };
            },
        }),
        Naver,
        Google,
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
    session: { strategy: 'jwt' },
    trustHost: true,
    pages: { signIn: '/login', error: '/login' },
    callbacks: {
        async signIn({ user, account }) {
            if (!account) return false;
            if (account.provider === 'review') return true; // already verified in authorize()
            const provider = account.provider;
            const providerAccountId = account.providerAccountId;
            const sql = getSql();

            const existing = await sql`
                select user_id from accounts
                where provider = ${provider} and provider_account_id = ${providerAccountId}
            `;

            if (existing.length > 0) {
                const userId = existing[0].user_id as string;
                await sql`update users set last_login_at = now() where id = ${userId}`;
                user.id = userId;
                return true;
            }

            // New social account: only /signup sets the consent cookie.
            const jar = await cookies();
            if (jar.get(CONSENT_COOKIE)?.value !== '1') {
                return '/signup?notice=not-registered';
            }
            const marketing = jar.get(MARKETING_COOKIE)?.value === '1';

            const created = await sql`
                insert into users (name, email, terms_agreed_at, privacy_agreed_at, marketing_agreed)
                values (${user.name ?? null}, ${user.email ?? null}, now(), now(), ${marketing})
                returning id
            `;
            const userId = created[0].id as string;
            await sql`
                insert into accounts (user_id, provider, provider_account_id)
                values (${userId}, ${provider}, ${providerAccountId})
            `;
            await issueWelcomeCoupon(userId);
            user.id = userId;
            return true;
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
