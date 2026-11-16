import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '../auth';
import { getSql } from './db';
import { PROFILE_FRESH_MS } from './profile-rules';

export type CurrentUser = {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    /** false while the name is still the nickname the social login gave */
    nameEdited: boolean;
    /** signed in within the last 10 minutes (name / phone changes need it) */
    fresh: boolean;
    createdAt: string;
    marketingAgreed: boolean;
    marketingUpdatedAt: string | null;
    role: 'user' | 'admin';
    providers: string[];
};

// Deduplicated per request, so the layout and the page can both call it.
export const getCurrentUser = cache(async (callbackPath: string = '/mypage'): Promise<CurrentUser> => {
    const session = await auth();
    if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);

    const sql = getSql();
    const users = await sql`
        select name, email, phone, name_edited_at, created_at, marketing_agreed, marketing_updated_at, role
        from users where id = ${session.user.id}
    `;
    // A JWT can outlive a withdrawn account; treat that as logged out.
    if (users.length === 0) redirect('/login');
    const accounts = await sql`select provider from accounts where user_id = ${session.user.id} order by created_at`;

    const u = users[0];
    return {
        id: session.user.id,
        name: (u.name as string | null) ?? null,
        email: (u.email as string | null) ?? null,
        phone: (u.phone as string | null) ?? null,
        nameEdited: Boolean(u.name_edited_at),
        fresh: Boolean(session.authAt && Date.now() - session.authAt < PROFILE_FRESH_MS),
        createdAt: new Date(u.created_at as string).toISOString(),
        marketingAgreed: Boolean(u.marketing_agreed),
        marketingUpdatedAt: u.marketing_updated_at ? new Date(u.marketing_updated_at as string).toISOString() : null,
        role: u.role === 'admin' ? 'admin' : 'user',
        providers: accounts.map((a) => a.provider as string),
    };
});
