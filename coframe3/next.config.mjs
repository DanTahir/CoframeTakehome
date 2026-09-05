/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Every asset is self-hosted under public/assets, so Next's image optimizer
  // would only add indirection. Plain <img> tags are used throughout to keep the
  // markup byte-faithful to the original Webflow output.
  images: { unoptimized: true },

  // GOTCHA (learned the hard way on a previous run): `next dev` and `next build`
  // sharing ./.next means running a production build while dev is live
  // overwrites the manifests dev serves from -> page renders with no CSS and
  // /_next/static/css/app/*.css starts 404ing. Next sets NODE_ENV before it
  // loads this config (dev -> development, build/start -> production), so
  // splitting distDir by env keeps the two from ever colliding.
  distDir: process.env.NODE_ENV === 'production' ? '.next-build' : '.next',
};

export default nextConfig;
