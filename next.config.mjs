/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        unoptimized: true,
    },
    // Ensure Cloudflare & Standalone output compatibility
    output: 'standalone',
    // Security headers on every response:
    //  - HSTS: browsers use https only (also the subdomains: www, cdn)
    //  - no framing by other sites (clickjacking); the Toss payment frames are inside our page, not around it
    //  - no camera / microphone / location access for scripts
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                ],
            },
        ];
    },
};

export default nextConfig;
