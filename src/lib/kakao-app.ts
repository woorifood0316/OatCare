// Kakao "간편로그인" (opens the KakaoTalk app, no id/password): the browser starts the login with Kakao's JavaScript
// SDK, Kakao sends the visitor back to /api/kakao/callback with a code, and the server exchanges it here with the
// REST key + secret. The resulting profile is the same shape the regular OAuth flow produces, so people who signed up
// either way are the same member.

export interface KakaoProfile {
    id: string;
    name: string | null;
    email: string | null;
}

// Overridable for tests (a local mock stands in for Kakao).
const TOKEN_URL = () => process.env.KAKAO_TOKEN_URL || 'https://kauth.kakao.com/oauth/token';
const USERINFO_URL = () => process.env.KAKAO_USERINFO_URL || 'https://kapi.kakao.com/v2/user/me';

/** Same mapping as the OAuth provider in auth.ts: nickname (required), e-mail only when verified. */
export function mapKakaoUser(p: {
    id: number | string;
    kakao_account?: {
        email?: string;
        is_email_valid?: boolean;
        is_email_verified?: boolean;
        profile?: { nickname?: string };
    };
}): KakaoProfile {
    const account = p.kakao_account;
    const emailOk = account?.is_email_valid && account?.is_email_verified;
    return {
        id: String(p.id),
        name: account?.profile?.nickname ?? null,
        email: emailOk ? (account?.email ?? null) : null,
    };
}

/** Why the Kakao login failed, short and safe to show (Kakao's own error code when it gave one, e.g. KOE320). */
export class KakaoLoginError extends Error {
    constructor(public reason: string) {
        super(`kakao login failed: ${reason}`);
    }
}

export async function exchangeKakaoCode(code: string, redirectUri: string): Promise<KakaoProfile> {
    const clientId = process.env.AUTH_KAKAO_ID;
    const clientSecret = process.env.AUTH_KAKAO_SECRET;
    if (!clientId) throw new KakaoLoginError('no_rest_key');
    if (!code) throw new KakaoLoginError('no_code');
    let tokenRes: Response;
    let token: { access_token?: string; error?: string; error_code?: string } | null;
    try {
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            redirect_uri: redirectUri,
            code,
        });
        if (clientSecret) body.set('client_secret', clientSecret);
        tokenRes = await fetch(TOKEN_URL(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
            body,
        });
        token = (await tokenRes.json().catch(() => null)) as typeof token;
    } catch {
        throw new KakaoLoginError('token_network');
    }
    if (!tokenRes.ok || !token?.access_token) {
        // e.g. {"error":"invalid_grant","error_code":"KOE320"} / {"error":"invalid_client","error_code":"KOE010"}
        throw new KakaoLoginError(`token_${token?.error_code || token?.error || tokenRes.status}`);
    }
    let meRes: Response;
    try {
        meRes = await fetch(USERINFO_URL(), { headers: { Authorization: `Bearer ${token.access_token}` } });
    } catch {
        throw new KakaoLoginError('me_network');
    }
    if (!meRes.ok) throw new KakaoLoginError(`me_${meRes.status}`);
    const me = (await meRes.json().catch(() => null)) as Parameters<typeof mapKakaoUser>[0] | null;
    if (!me?.id) throw new KakaoLoginError('me_empty');
    return mapKakaoUser(me);
}
