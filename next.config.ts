import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Polyfills for @stellar-zklogin/sdk browser compatibility
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        buffer: false,
        fs: false,
        path: false,
        os: false,
        http: false,
        https: false,
        net: false,
        tls: false,
        zlib: false,
      };
    }
    // Handle .mjs files from SDK
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });
    return config;
  },
  // Transpile the local SDK package
  transpilePackages: ['@stellar-zklogin/sdk'],
};

export default nextConfig;
