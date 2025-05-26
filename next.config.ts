import type { NextConfig } from 'next';

module.exports = {
  output: "standalone",
};

const nextConfig: NextConfig = {
  cacheHandler: require.resolve(
    'next/dist/server/lib/incremental-cache/file-system-cache.js',
),
};

export default nextConfig;
