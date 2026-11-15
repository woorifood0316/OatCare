import { NextResponse } from 'next/server';
import { auth } from './auth';
import { getSql } from './lib/db';
import { ADMIN_SEEN_COOKIE, adminActive } from './lib/admin-idle';

/**
 * The admin pages are checked here, before anything is rendered. (A check in app/admin/layout.tsx alone is not
 * enough: Next.js renders the page next to the layout, so its data would travel in the response even when the
 * layout shows something else.)
 *  - not logged in: to the login page
 *  - not an admin: 404
 *  - admin who has not used the admin pages for 12 hours: log in again (lib/admin-idle.ts)
 */
export default auth(async (req) => {
    const uid = req.auth?.user?.id;
    if (!uid) {
        const login = new URL('/login', req.url);
        login.searchParams.set('callbackUrl', req.nextUrl.pathname);
        return NextResponse.redirect(login);
    }
    const rows = await getSql()`select role from users where id = ${uid}`;
    if (rows[0]?.role !== 'admin') return new NextResponse('Not Found', { status: 404 });
    if (!(await adminActive(uid, req.auth?.authAt, req.cookies.get(ADMIN_SEEN_COOKIE)?.value))) {
        return NextResponse.redirect(new URL('/reauth', req.url));
    }
    return NextResponse.next();
});

export const config = { matcher: ['/admin', '/admin/:path*'] };
