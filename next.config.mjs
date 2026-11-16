// Content Security Policy, REPORT-ONLY for now: the browser reports what it would have blocked to /api/csp-report
// and blocks nothing. Once the reports show only noise, the same policy can be switched to enforcing.
// Sources: Toss payment window, Kakao SDK / login, Daum address search, fonts (jsDelivr, Google), the R2 image
// buckets, Cloudflare's analytics beacon. Next.js needs inline scripts and styles ('unsafe-inline').
const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_URL || 'https://pub-a86a2d7952624f80aed6c433a53f18f9.r2.dev';
const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.tosspayments.com https://*.tosspayments.com https://t1.kakaocdn.net https://t1.daumcdn.net https://*.daum.net https://*.daumcdn.net https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://*.tosspayments.com",
    "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${R2_PUBLIC} https://*.r2.dev https://*.tosspayments.com https://*.kakaocdn.net https://*.daumcdn.net https://*.kakao.com`,
    "connect-src 'self' https://*.tosspayments.com https://*.kakao.com https://*.daum.net https://*.daumcdn.net https://cloudflareinsights.com",
    "frame-src 'self' https://*.tosspayments.com https://*.daum.net https://*.kakao.com",
    "worker-src 'self'",
    "manifest-src 'self'",
    `media-src 'self' ${R2_PUBLIC} https://*.r2.dev`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://kauth.kakao.com https://accounts.kakao.com https://nid.naver.com https://accounts.google.com https://*.tosspayments.com",
    "frame-ancestors 'self'",
    'report-uri /api/csp-report',
].join('; ');

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
    //  - CSP in report-only mode (see above)
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
                    { key: 'Content-Security-Policy-Report-Only', value: csp },
                ],
            },
        ];
    },
};

export default nextConfig;
