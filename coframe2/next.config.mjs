/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // All media is self-hosted under /public/assets, so Next's optimizer adds nothing
  // but would rewrite the URLs the replica's CSS depends on.
  images: { unoptimized: true },
  // Dev and production builds must not share a distDir: running `next build` while
  // `next dev` is live otherwise overwrites the manifests dev is serving from, which
  // presents as the page rendering with no CSS and /_next/static/css/* 404ing.
  // Next sets NODE_ENV before loading this config (dev -> development, build/start ->
  // production), so the two never collide.
  distDir: process.env.NODE_ENV === 'production' ? '.next-build' : '.next',
};

export default nextConfig;
