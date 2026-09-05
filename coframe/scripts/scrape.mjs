/**
 * scrape.mjs — downloads every asset the www.coframe.com homepage depends on
 * into ./public/assets so the replica is fully self-hosted and offline-capable.
 *
 * Steps:
 *   1. Fetch the homepage HTML (cached at ./scrape/index.html).
 *   2. Fetch the Webflow stylesheet + the Google Fonts CSS.
 *   3. Collect every asset URL from the HTML (img/src, srcset, video, poster,
 *      link icons, inline style url(), preload hrefs) and from the CSS
 *      (url(...) references, including the woff2 font files).
 *   4. Download them all in parallel, flattening to safe local filenames.
 *   5. Rewrite the CSS so url(...) points at the local copies, and emit
 *      ./scrape/asset-map.json recording the remote -> local mapping.
 *
 * Usage: node scripts/scrape.mjs [--force]
 */
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SCRAPE_DIR = path.join(ROOT, 'scrape');
const ASSET_DIR = path.join(ROOT, 'public', 'assets');
const FONT_DIR = path.join(ASSET_DIR, 'fonts');
const STYLE_DIR = path.join(ROOT, 'app', 'styles');

const HOMEPAGE = 'https://www.coframe.com/';
const WEBFLOW_CSS =
  'https://cdn.prod.website-files.com/66abefe349b0c8356d750497/css/coframe-d4f597.webflow.shared.284bf7c4c.min.css';
const GOOGLE_FONTS_CSS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const force = process.argv.includes('--force');

/** Fetch a URL as text, with a browser-ish UA. */
async function getText(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Webflow CDN filenames look like
 *   66abefe349b0c8356d750497/670125674a2baa1b2f1e2c04__coframe-hero-illustration.avif
 * The leading hash is noise; keep the human-readable tail but keep enough of
 * the hash to guarantee uniqueness.
 */
function localNameFor(url) {
  const { pathname } = new URL(url);
  const base = decodeURIComponent(pathname.split('/').pop() || 'asset');
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Strip the 24-char Webflow object id prefix but keep a short discriminator.
  const m = cleaned.match(/^([0-9a-f]{16,32})_+(.+)$/i);
  if (m) return `${m[1].slice(0, 6)}-${m[2]}`;
  return cleaned;
}

function isFont(url) {
  return /\.(woff2?|ttf|otf|eot)(\?|$)/i.test(url);
}

/** Absolutize a possibly protocol-relative / relative URL. */
function abs(url, base) {
  try {
    return new URL(url, base).href;
  } catch {
    return null;
  }
}

const DOWNLOADABLE = /\.(avif|webp|png|jpe?g|gif|svg|mp4|webm|woff2?|ttf|otf|ico|riv)(\?|$)/i;

/** Pull asset URLs out of raw HTML using regexes (no DOM needed). */
function assetUrlsFromHtml(html) {
  const urls = new Set();
  const add = (u) => {
    const a = abs(u.trim(), HOMEPAGE);
    if (a && DOWNLOADABLE.test(a)) urls.add(a);
  };

  // src="..." and href="..." and poster="..." and content="..." (og:image),
  // plus data-rive-url="..." for the hero's Rive chart animation.
  for (const m of html.matchAll(
    /(?:src|href|poster|content|data-src|data-rive-url)\s*=\s*"([^"]+)"/gi,
  )) {
    add(m[1]);
  }
  // srcset="url 500w, url 800w"
  for (const m of html.matchAll(/srcset\s*=\s*"([^"]+)"/gi)) {
    for (const part of m[1].split(',')) add(part.trim().split(/\s+/)[0]);
  }
  // inline style="background-image:url(...)"
  for (const m of html.matchAll(/url\((['"]?)([^'")]+)\1\)/gi)) add(m[2]);

  return [...urls];
}

/** Pull url(...) references out of a stylesheet. */
function assetUrlsFromCss(css, base) {
  const urls = new Set();
  for (const m of css.matchAll(/url\((['"]?)([^'")]+)\1\)/gi)) {
    if (m[2].startsWith('data:')) continue;
    const a = abs(m[2], base);
    if (a) urls.add(a);
  }
  return [...urls];
}

async function download(url, destDir) {
  const name = localNameFor(url);
  const dest = path.join(destDir, name);
  if (!force && (await exists(dest))) return { url, name, skipped: true };
  const res = await fetch(url, { headers: { 'user-agent': UA, referer: HOMEPAGE } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return { url, name, bytes: buf.length };
}

/** Download with limited concurrency so we don't hammer the CDN. */
async function downloadAll(urls, destDir, limit = 8) {
  const queue = [...urls];
  const done = [];
  const failed = [];
  const workers = Array.from({ length: limit }, async () => {
    while (queue.length) {
      const url = queue.shift();
      try {
        done.push(await download(url, destDir));
      } catch (err) {
        failed.push({ url, error: String(err.message || err) });
      }
    }
  });
  await Promise.all(workers);
  return { done, failed };
}

async function main() {
  await mkdir(SCRAPE_DIR, { recursive: true });
  await mkdir(ASSET_DIR, { recursive: true });
  await mkdir(FONT_DIR, { recursive: true });
  await mkdir(STYLE_DIR, { recursive: true });

  // ---- 1. HTML -------------------------------------------------------------
  const htmlPath = path.join(SCRAPE_DIR, 'index.html');
  let html;
  if (!force && (await exists(htmlPath))) {
    html = await readFile(htmlPath, 'utf8');
    console.log(`[html] using cached ${path.relative(ROOT, htmlPath)}`);
  } else {
    html = await getText(HOMEPAGE);
    await writeFile(htmlPath, html, 'utf8');
    console.log(`[html] downloaded ${html.length} bytes`);
  }

  // ---- 2. Stylesheets ------------------------------------------------------
  const webflowCss = await getText(WEBFLOW_CSS);
  await writeFile(path.join(SCRAPE_DIR, 'webflow.raw.css'), webflowCss, 'utf8');
  console.log(`[css] webflow stylesheet ${webflowCss.length} bytes`);

  const fontsCss = await getText(GOOGLE_FONTS_CSS);
  await writeFile(path.join(SCRAPE_DIR, 'fonts.raw.css'), fontsCss, 'utf8');
  console.log(`[css] google fonts stylesheet ${fontsCss.length} bytes`);

  // ---- 3. Collect ----------------------------------------------------------
  const htmlAssets = assetUrlsFromHtml(html);
  const cssAssets = assetUrlsFromCss(webflowCss, WEBFLOW_CSS);
  const fontAssets = assetUrlsFromCss(fontsCss, GOOGLE_FONTS_CSS);

  const imageLike = [...new Set([...htmlAssets, ...cssAssets])].filter((u) => !isFont(u));
  const fonts = [...new Set([...cssAssets, ...fontAssets, ...htmlAssets])].filter(isFont);

  console.log(`[collect] ${imageLike.length} media assets, ${fonts.length} font files`);

  // ---- 4. Download ---------------------------------------------------------
  const media = await downloadAll(imageLike, ASSET_DIR);
  const fontRes = await downloadAll(fonts, FONT_DIR);

  console.log(
    `[media] ${media.done.length} ok (${media.done.filter((d) => d.skipped).length} cached), ${media.failed.length} failed`,
  );
  console.log(
    `[fonts] ${fontRes.done.length} ok (${fontRes.done.filter((d) => d.skipped).length} cached), ${fontRes.failed.length} failed`,
  );
  for (const f of [...media.failed, ...fontRes.failed]) console.warn(`  !! ${f.url} :: ${f.error}`);

  // ---- 5. Rewrite CSS + write map -----------------------------------------
  const map = {};
  for (const d of media.done) map[d.url] = `/assets/${d.name}`;
  for (const d of fontRes.done) map[d.url] = `/assets/fonts/${d.name}`;

  const rewriteCss = (css, base) =>
    css.replace(/url\((['"]?)([^'")]+)\1\)/gi, (full, _q, raw) => {
      if (raw.startsWith('data:')) return full;
      const a = abs(raw, base);
      const local = a && map[a];
      return local ? `url("${local}")` : full;
    });

  await writeFile(
    path.join(STYLE_DIR, 'webflow.css'),
    `/* Downloaded from ${WEBFLOW_CSS}\n   url() references rewritten to self-hosted /assets copies by scripts/scrape.mjs. */\n` +
      rewriteCss(webflowCss, WEBFLOW_CSS),
    'utf8',
  );
  await writeFile(
    path.join(STYLE_DIR, 'fonts.css'),
    `/* Downloaded from ${GOOGLE_FONTS_CSS}\n   Inter woff2 files self-hosted under /assets/fonts by scripts/scrape.mjs. */\n` +
      rewriteCss(fontsCss, GOOGLE_FONTS_CSS),
    'utf8',
  );
  await writeFile(path.join(SCRAPE_DIR, 'asset-map.json'), JSON.stringify(map, null, 2), 'utf8');

  console.log(`[done] wrote app/styles/webflow.css, app/styles/fonts.css, scrape/asset-map.json`);
  console.log(`[done] ${Object.keys(map).length} assets mapped`);
}

await main();
