import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
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
    if (url.searchParams.get('error') || !code) redirect('/login?error=AccessDenied');
    if (!expected || state !== expected) redirect('/login?error=AccessDenied');

    try {
        await signIn('kakao-app', { code, redirectUri: `${url.origin}/api/kakao/callback`, redirectTo: target });
    } catch (e) {
        if (isRedirect(e)) throw e; // Auth.js finished (or sent the visitor to /signup): follow it
        redirect('/login?error=Default');
    }
    redirect(target);
}
