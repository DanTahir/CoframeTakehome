/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `next dev` and `next build` would otherwise share ./.next, so running a
  // production build while the dev server is up overwrites the manifests the
  // dev server is actively serving from. The symptom is a page that loads with
  // no CSS (its /_next/static/css/app/*.css requests start 404ing) plus
  // "Could not find the module ... in the React Client Manifest" errors.
  // Next sets NODE_ENV before loading this file: `dev` => development (.next),
  // `build`/`start` => production (.next-build), so the two never collide.
  distDir: process.env.NODE_ENV === 'production' ? '.next-build' : '.next',
  // All art assets are downloaded and self-hosted under /public/assets,
  // so no remote image loader configuration is required.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
