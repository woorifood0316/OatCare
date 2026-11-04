import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CredentialsSignin } from 'next-auth';
import { signIn } from '../../../../auth';
import { safeCallbackPath } from '../../../../lib/safe-redirect';

export const runtime = 'edge';

const isRedirect = (e: unknown) => typeof (e as { digest?: unknown })?.digest === 'string' && String((e as { digest: string }).digest).startsWith('NEXT_REDIRECT');

/**
 * Where Kakao's JavaScript-SDK login (KakaoTalk app "간편로그인") returns the visitor.
 * The browser set two short-lived cookies before leaving: oc_kstate (anti-forgery) and oc_kcb (where to go after).
 */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const jar = await cookies();
    const expected = jar.get('oc_kstate')?.value;
    const target = safeCallbackPath(jar.get('oc_kcb')?.value ? decodeURIComponent(jar.get('oc_kcb')!.value) : '/');
    jar.delete('oc_kstate');
    jar.delete('oc_kcb');

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const fail = (reason: string): never => {
        console.error('[kakao-callback]', reason);
        redirect(`/login?error=KakaoLogin&reason=${encodeURIComponent(reason.slice(0, 60))}`);
    };
    const kakaoError = url.searchParams.get('error');
    // The visitor pressed cancel on Kakao's consent screen.
    if (kakaoError === 'access_denied') redirect('/login?error=AccessDenied');
    if (kakaoError) fail(`kakao_${kakaoError}`);
    if (!code) fail('no_code');
    // No state cookie: the login came back in a different browser/app than the one that started it
    // (e.g. KakaoTalk reopened the link in another browser), or more than 10 minutes passed.
    if (!expected) fail('state_cookie_missing');
    if (state !== expected) fail('state_mismatch');

    try {
        await signIn('kakao-app', { code, redirectUri: `${url.origin}/api/kakao/callback`, redirectTo: target });
    } catch (e) {
        if (isRedirect(e)) throw e; // Auth.js finished (or sent the visitor to /signup): follow it
        if (e instanceof CredentialsSignin) fail(e.code || 'credentials');
        const cause = (e as { cause?: { err?: { message?: string } } })?.cause?.err?.message;
        fail(`signin_${(e as Error)?.name ?? 'error'}${cause ? `_${cause}` : ''}`);
    }
    redirect(target);
}
