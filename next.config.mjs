/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  basePath: isProd ? '/elastic-docker-images-vuln-report' : '',
  assetPrefix: isProd ? '/elastic-docker-images-vuln-report/' : '',
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
