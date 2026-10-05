import { auth, signOut } from '../../../../auth';
import { getSql } from '../../../../lib/db';

export const runtime = 'edge';

export async function POST(request: Request) {
    // CSRF guard: only same-origin form posts.
    const origin = request.headers.get('origin');
    if (!origin || new URL(origin).host !== new URL(request.url).host) {
        return new Response('Forbidden', { status: 403 });
    }

    const session = await auth();
    if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 });
    }

    // accounts rows are removed by ON DELETE CASCADE.
    const sql = getSql();
    await sql`delete from users where id = ${session.user.id}`;

    await signOut({ redirectTo: '/?withdrawn=1' });
}
