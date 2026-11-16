import { requireAdmin, sessionUserId } from '../../../../../lib/api';
import { r2GetPrivate } from '../../../../../lib/r2';
import { parseReturnPhoto } from '../../../../../lib/return-photo';
import { logAdminAccess } from '../../../../../lib/access-log';

export const runtime = 'edge';

const notFound = () => new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });

/**
 * An exchange/return evidence photo from the private bucket. Only the member who sent it, or an admin, gets it;
 * everyone else (logged out, other members) gets 404, the same as for a photo that does not exist.
 */
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const photo = parseReturnPhoto((path ?? []).join('/'));
    if (!photo) return notFound();

    const uid = await sessionUserId();
    if (!uid) return notFound();
    if (uid.toLowerCase() !== photo.owner) {
        if (!(await requireAdmin())) return notFound();
        // an admin opening a customer's photo is recorded like other access to customer data
        await logAdminAccess({
            userId: uid,
            outcome: 'allowed',
            method: 'GET',
            path: new URL(request.url).pathname,
            ip: request.headers.get('cf-connecting-ip'),
            country: request.headers.get('cf-ipcountry'),
            userAgent: request.headers.get('user-agent'),
        });
    }

    const obj = await r2GetPrivate(photo.key);
    if (!obj?.body) return notFound();
    return new Response(obj.body, {
        headers: {
            'Content-Type': obj.contentType,
            // personal data: never kept by shared caches, only briefly by this browser
            'Cache-Control': 'private, max-age=300',
            'X-Content-Type-Options': 'nosniff',
            'Content-Disposition': 'inline',
        },
    });
}
