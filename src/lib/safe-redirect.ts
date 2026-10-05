// Only allow same-site relative paths (blocks open redirects like //evil.com).
export function safeCallbackPath(value: string | null | undefined): string {
    if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
        return '/';
    }
    if (value.startsWith('/login') || value.startsWith('/signup')) {
        return '/';
    }
    return value;
}
