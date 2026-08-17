export const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_URL || 'https://pub-a86a2d7952624f80aed6c433a53f18f9.r2.dev';

/**
 * Returns full Cloudflare R2 CDN URL for static assets.
 * Falls back to local asset path if fetch fails or during offline dev.
 */
export const getAssetUrl = (path: string): string => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${R2_BASE_URL}${cleanPath}`;
};
