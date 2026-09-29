/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.56.1:3000', '192.168.56.1', 'localhost:3000', '127.0.0.1:3000'],
  outputFileTracingIncludes: {
    '/*': ['./template/**/*.docx'],
  },
  turbopack: {
    ignoreIssue: [
      {
        path: '**/next.config.*',
        title: 'Encountered unexpected file in NFT list',
      },
    ],
  },
};

export default nextConfig;
