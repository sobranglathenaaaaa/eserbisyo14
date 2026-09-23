/** @type {import('next').NextConfig} */
const nextConfig = {
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
