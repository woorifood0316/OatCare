import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const base = 'https://chamoatcare.com';
    return ['', '/privacy', '/terms'].map((path) => ({ url: base + path }));
}
