import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth, signOut } from '../../auth';
import { getSql } from '../../lib/db';
import { WithdrawButton } from '../../components/WithdrawButton';

export const runtime = 'edge';

export const metadata: Metadata = {
    title: '마이페이지 | 참오트케어',
    robots: { index: false, follow: false },
};

const PROVIDER_LABEL: Record<string, string> = { kakao: '카카오', naver: '네이버', google: '구글' };

export default async function MyPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login?callbackUrl=%2Fmypage');

    const sql = getSql();
    const users = await sql`
        select name, email, created_at from users where id = ${session.user.id}
    `;
    // A JWT can outlive a withdrawn account; treat that as logged out.
    if (users.length === 0) redirect('/login');
    const accounts = await sql`select provider from accounts where user_id = ${session.user.id}`;

    const user = users[0];
    const providers = accounts.map((a) => PROVIDER_LABEL[a.provider as string] ?? (a.provider as string)).join(', ');
    const joined = new Date(user.created_at as string).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <main className="oc-auth">
            <div className="oc-auth__card">
                <a href="/" className="oc-auth__brand" aria-label="참오트케어 홈">
                    <span>chamoatcare</span>
                </a>
                <h1 className="oc-auth__title">마이페이지</h1>

                <div className="oc-my__profile">
                    <div>
                        <strong>{(user.name as string) || '회원'}</strong>
                        {user.email ? <div className="oc-my__muted">{user.email as string}</div> : null}
                    </div>
                </div>

                <dl className="oc-my__list">
                    <div>
                        <dt>가입 방법</dt>
                        <dd>{providers}</dd>
                    </div>
                    <div>
                        <dt>가입일</dt>
                        <dd>{joined}</dd>
                    </div>
                </dl>

                <form
                    action={async () => {
                        'use server';
                        await signOut({ redirectTo: '/' });
                    }}
                >
                    <button type="submit" className="oc-auth__btn oc-auth__btn--plain">
                        로그아웃
                    </button>
                </form>

                <WithdrawButton />

                <p className="oc-auth__switch">
                    <a href="/">홈으로 돌아가기</a>
                </p>
            </div>
        </main>
    );
}
