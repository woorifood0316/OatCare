import { auth } from '../../../../auth';
import { getSql } from '../../../../lib/db';

export const runtime = 'edge';

export async function POST(request: Request) {
    // CSRF guard: only same-origin requests.
    const origin = request.headers.get('origin');
    if (!origin || new URL(origin).host !== new URL(request.url).host) {
        return new Response('Forbidden', { status: 403 });
    }

    const session = await auth();
    if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 });
    }

    let agreed: unknown;
    try {
        ({ agreed } = await request.json());
    } catch {
        return new Response('Bad Request', { status: 400 });
    }
    if (typeof agreed !== 'boolean') {
        return new Response('Bad Request', { status: 400 });
    }

    const sql = getSql();
    await sql`
        update users set marketing_agreed = ${agreed}, marketing_updated_at = now()
        where id = ${session.user.id}
    `;
    return Response.json({ agreed });
}
