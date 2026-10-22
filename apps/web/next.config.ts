import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@elodia/shared'],
  poweredByHeader: false,
};

export default config;
