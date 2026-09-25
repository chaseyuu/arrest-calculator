import type { NextConfig } from 'next';

// On GitHub Pages a project site lives under /<repo-name>. The deploy workflow
// sets NEXT_PUBLIC_BASE_PATH automatically; locally it stays empty.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
