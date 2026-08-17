export const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_URL || 'https://pub-a86a2d7952624f80aed6c433a53f18f9.r2.dev';

/**
 * Returns full Cloudflare R2 CDN URL for static assets.
 * Strips leading /assets/ prefix to map directly to R2 bucket root files.
 */
export const getAssetUrl = (path: string): string => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;

    // Strip optional leading slash and /assets/ directory prefix
    const filename = path.replace(/^\/?(assets\/)?/, '');
    return `${R2_BASE_URL}/${filename}`;
};
