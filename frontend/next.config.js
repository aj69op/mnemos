/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://mnemos-production-4501.up.railway.app/:path*',
      },
    ]
  },
};

module.exports = nextConfig;
