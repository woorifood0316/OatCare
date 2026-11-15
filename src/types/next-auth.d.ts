import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
        /** When this login happened (ms). The admin pages accept a fresh login as activity. */
        authAt?: number;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        uid?: string;
        /** users.session_version at login; a different number in the DB means "logged out everywhere". */
        sv?: number;
        authAt?: number;
    }
}
