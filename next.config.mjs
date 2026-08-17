/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        unoptimized: true,
    },
    // Ensure Cloudflare & Standalone output compatibility
    output: 'standalone',
};

export default nextConfig;
