import { NextResponse } from 'next/server';
import { auth } from './auth';
import { getSql } from './lib/db';
import { ADMIN_SEEN_COOKIE, adminActive } from './lib/admin-idle';
import { logAdminAccess, type AccessOutcome } from './lib/access-log';

/**
 * The admin pages and admin API are checked here, before anything is rendered. (A check in app/admin/layout.tsx
 * alone is not enough: Next.js renders the page next to the layout, so its data would travel in the response even
 * when the layout shows something else.)
 *  - not logged in: to the login page (API: 401)
 *  - not an admin: 404 (API: 403)
 *  - admin who has not used the admin pages for 12 hours: log in again (lib/admin-idle.ts)
 * Every request, allowed or refused, goes to the access log (lib/access-log.ts).
 */
export default auth(async (req) => {
    const path = req.nextUrl.pathname;
    const api = path.startsWith('/api/');
    const uid = req.auth?.user?.id ?? null;

    let outcome: AccessOutcome = 'allowed';
    if (!uid) outcome = 'anonymous';
    else {
        const rows = await getSql()`select role from users where id = ${uid}`;
        if (rows[0]?.role !== 'admin') outcome = 'not_admin';
        else if (!(await adminActive(uid, req.auth?.authAt, req.cookies.get(ADMIN_SEEN_COOKIE)?.value))) outcome = 'idle';
    }

    // The activity ping on every admin page view would only double the page entries.
    if (!(outcome === 'allowed' && path === '/api/admin/seen')) {
        await logAdminAccess({
            userId: uid,
            outcome,
            method: req.method,
            path: path + req.nextUrl.search,
            ip: req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
            country: req.headers.get('cf-ipcountry'),
            userAgent: req.headers.get('user-agent'),
        });
    }

    if (outcome === 'allowed') return NextResponse.next();
    if (api) {
        return NextResponse.json({ error: outcome === 'not_admin' ? 'Forbidden' : '다시 로그인해 주세요' }, { status: outcome === 'not_admin' ? 403 : 401 });
    }
    if (outcome === 'anonymous') {
        const login = new URL('/login', req.url);
        login.searchParams.set('callbackUrl', path);
        return NextResponse.redirect(login);
    }
    if (outcome === 'not_admin') return new NextResponse('Not Found', { status: 404 });
    return NextResponse.redirect(new URL('/reauth', req.url));
});

export const config = { matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'] };
