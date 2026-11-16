// Exchange/return evidence photos live in the PRIVATE bucket under returns/<member id>/... and are shown only through
// /api/returns/photo/<member id>/<month>/<file>, which lets in the member who sent them and admins.

export const RETURN_PHOTO_BASE = '/api/returns/photo/';

const PATH_RE = /^([0-9a-f-]{36})\/(\d{4}-\d{2})\/([0-9a-f-]{36})\.(webp|jpg|png)$/i;

/** Where a new photo of this member goes: the bucket key and the address the pages use. */
export function newReturnPhoto(userId: string, ext: string): { key: string; url: string } {
    const rel = `${userId}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
    return { key: `returns/${rel}`, url: `${RETURN_PHOTO_BASE}${rel}` };
}

/** "<member id>/<month>/<file>" -> the owner and the bucket key, or null for anything else. */
export function parseReturnPhoto(rel: string): { owner: string; key: string } | null {
    const m = rel.match(PATH_RE);
    return m ? { owner: m[1].toLowerCase(), key: `returns/${rel}` } : null;
}

/** A photo address this member may attach to their own request. */
export function isOwnReturnPhoto(url: string, userId: string): boolean {
    if (!url.startsWith(RETURN_PHOTO_BASE)) return false;
    const p = parseReturnPhoto(url.slice(RETURN_PHOTO_BASE.length));
    return Boolean(p && p.owner === userId.toLowerCase());
}
