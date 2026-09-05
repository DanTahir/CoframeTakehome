// Shared URL-rewriting helpers used by both generators.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

/** Loads scrape/asset-map.json -> { originalUrl: '/assets/...' }. */
export async function loadAssetMap() {
  const raw = await readFile(path.join(ROOT, 'scrape', 'asset-map.json'), 'utf8');
  return JSON.parse(raw).map;
}

/**
 * Assets the live page references that cannot be mirrored, mapped to a
 * self-hosted stand-in.
 *
 * Webflow serves its CMS empty-state placeholder from a /plugins/ path that
 * returns HTTP 403 to non-Webflow origins, so fetch-assets.mjs records it as a
 * failure (see the `failures` array in scrape/asset-map.json). The homepage
 * references it from four `.w-dyn-bind-empty` <img> elements. Webflow's own
 * stylesheet hides those with `display: none !important`, but browsers still
 * issue the request for a display:none image - so leaving the original URL in
 * place would mean the replica fires four failing cross-origin requests on every
 * load. Pointing them at a local stand-in keeps the replica fully self-hosted
 * without changing anything visible.
 */
export const UNFETCHABLE_ASSET_FALLBACKS = {
  'https://cdn.prod.website-files.com/plugins/Basic/assets/placeholder.60f9b1840c.svg':
    '/assets/media/webflow-plugin-placeholder.svg',
};

/**
 * Rewrites a single remote asset URL to its self-hosted path.
 * Unknown/looks-non-asset URLs are returned unchanged.
 */
export function rewriteAssetUrl(url, map) {
  if (!url) return url;
  let u = url.trim();
  if (u.startsWith('//')) u = 'https:' + u;
  if (map[u]) return map[u];
  // Try without query string.
  const q = u.indexOf('?');
  if (q !== -1 && map[u.slice(0, q)]) return map[u.slice(0, q)];
  if (UNFETCHABLE_ASSET_FALLBACKS[u]) return UNFETCHABLE_ASSET_FALLBACKS[u];
  return url;
}

/** Rewrites every url(...) occurrence in a CSS string. */
export function rewriteCssUrls(css, map) {
  return css.replace(/url\((['"]?)([^)'"]+)\1\)/g, (full, quote, url) => {
    const next = rewriteAssetUrl(url, map);
    return next === url ? full : `url(${quote}${next}${quote})`;
  });
}

/** Rewrites a srcset attribute value ("url 500w, url 800w"). */
export function rewriteSrcset(value, map) {
  return value
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return null;
      const [url, ...rest] = trimmed.split(/\s+/);
      return [rewriteAssetUrl(url, map), ...rest].join(' ');
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * The replica is a single page, but every link must still resolve to the real
 * Coframe site. Root-relative paths are absolutised onto www.coframe.com;
 * in-page hashes and already-absolute URLs are left alone.
 */
export const SITE_ORIGIN = 'https://www.coframe.com';

export function rewriteHref(href) {
  if (!href) return href;
  const h = href.trim();
  if (!h) return href;
  if (h === '#') return h; // Webflow placeholder link
  if (h.startsWith('#')) return h; // in-page anchor
  if (/^(https?:|mailto:|tel:|javascript:)/i.test(h)) return h;
  if (h.startsWith('//')) return 'https:' + h;
  if (h.startsWith('/')) return SITE_ORIGIN + h;
  return SITE_ORIGIN + '/' + h;
}
