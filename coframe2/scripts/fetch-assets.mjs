// Downloads every remote asset the homepage depends on (images, svg, video, fonts,
// the Rive chart file) into public/assets/, and writes scrape/asset-map.json mapping
// each original absolute URL to its local /assets/... path.
//
// Sources scanned:
//   - scrape/raw/index.html   (src, srcset, href, poster, data-rive-url, inline url())
//   - scrape/raw/css/*.css    (url(...) refs -> Webflow-hosted font files etc.)
//   - Google Fonts CSS API    (Inter 300..700, which the page loads via WebFont.load)
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'scrape', 'raw');
const PUB = path.join(ROOT, 'public', 'assets');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Hosts whose assets we self-host. Third-party analytics/tag hosts are deliberately
// excluded: the replica does not run tracking.
const ASSET_HOSTS = new Set([
  'cdn.prod.website-files.com',
  'd3e54v103j8qbb.cloudfront.net',
  'fonts.gstatic.com',
  'assets-global.website-files.com',
]);

const FONT_EXT = new Set(['woff', 'woff2', 'ttf', 'otf', 'eot']);
const RIVE_EXT = new Set(['riv']);

const urls = new Set();

function addUrl(u) {
  if (!u) return;
  let raw = u.trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('#')) return;
  if (raw.startsWith('//')) raw = 'https:' + raw;
  if (!/^https?:\/\//i.test(raw)) return;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return;
  }
  if (!ASSET_HOSTS.has(parsed.hostname)) return;
  // Strip the query string: Webflow CDN assets are content-addressed by path.
  parsed.hash = '';
  urls.add(parsed.href);
}

function scanHtml(html) {
  for (const m of html.matchAll(/(?:src|href|poster|data-rive-url|content)="([^"]+)"/g)) addUrl(m[1]);
  // srcset: "url 500w, url 800w"
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) addUrl(part.trim().split(/\s+/)[0]);
  }
  for (const m of html.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)) addUrl(m[2]);
}

function scanCss(css) {
  for (const m of css.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)) addUrl(m[2]);
}

const html = await readFile(path.join(RAW, 'index.html'), 'utf8');
scanHtml(html);

const cssDir = path.join(RAW, 'css');
for (const f of await readdir(cssDir)) {
  if (f.endsWith('.css')) scanCss(await readFile(path.join(cssDir, f), 'utf8'));
}

// --- Google Fonts: fetch the CSS with a modern UA so we get woff2 face URLs, and
// self-host both the CSS and the font binaries (the live page pulls these at runtime
// via WebFont.load; the replica must not).
const GOOGLE_CSS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
let googleCss = '';
try {
  const res = await fetch(GOOGLE_CSS, { headers: { 'user-agent': UA } });
  if (res.ok) {
    googleCss = await res.text();
    scanCss(googleCss);
    console.log(`google fonts css: ${googleCss.length}B, ${(googleCss.match(/url\(/g) ?? []).length} faces`);
  } else {
    console.log(`google fonts css FAILED ${res.status}`);
  }
} catch (err) {
  console.log(`google fonts css ERR ${err.message}`);
}

await mkdir(path.join(PUB, 'media'), { recursive: true });
await mkdir(path.join(PUB, 'fonts'), { recursive: true });
await mkdir(path.join(PUB, 'rive'), { recursive: true });

function localNameFor(u) {
  const parsed = new URL(u);
  let base = decodeURIComponent(path.basename(parsed.pathname));
  base = base.replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-');
  const ext = base.split('.').pop().toLowerCase();
  const dir = FONT_EXT.has(ext) ? 'fonts' : RIVE_EXT.has(ext) ? 'rive' : 'media';
  return { dir, base, ext };
}

const map = {};
const taken = new Map(); // dir/base -> source url, to detect collisions
let ok = 0;
let failed = 0;
const failures = [];

const all = [...urls];
console.log(`\nDownloading ${all.length} assets...`);

const CONCURRENCY = 8;
let cursor = 0;

async function worker() {
  while (cursor < all.length) {
    const u = all[cursor++];
    const { dir, base, ext } = localNameFor(u);
    let name = base;
    const key = () => `${dir}/${name}`;
    if (taken.has(key()) && taken.get(key()) !== u) {
      // Same filename, different source: disambiguate with a short URL hash.
      const h = createHash('sha1').update(u).digest('hex').slice(0, 8);
      const dot = base.lastIndexOf('.');
      name = dot === -1 ? `${base}-${h}` : `${base.slice(0, dot)}-${h}${base.slice(dot)}`;
    }
    taken.set(`${dir}/${name}`, u);
    try {
      const res = await fetch(u, { headers: { 'user-agent': UA, referer: 'https://www.coframe.com/' } });
      if (!res.ok) {
        failed++;
        failures.push({ url: u, status: res.status });
        console.log(`FAIL ${res.status}  ${base}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(path.join(PUB, dir, name), buf);
      map[u] = `/assets/${dir}/${name}`;
      ok++;
      if (ok % 20 === 0) console.log(`  ...${ok}/${all.length}`);
    } catch (err) {
      failed++;
      failures.push({ url: u, error: err.message });
      console.log(`ERR  ${base}  ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// Rewrite the Google Fonts CSS to point at the self-hosted binaries.
if (googleCss) {
  let rewritten = googleCss;
  for (const [orig, local] of Object.entries(map)) {
    if (orig.includes('fonts.gstatic.com')) rewritten = rewritten.split(orig).join(local);
  }
  await writeFile(path.join(ROOT, 'scrape', 'google-fonts.css'), rewritten);
  console.log(`\nwrote scrape/google-fonts.css (${rewritten.length}B)`);
}

await writeFile(
  path.join(ROOT, 'scrape', 'asset-map.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), count: ok, map, failures }, null, 2),
);

const byDir = {};
for (const local of Object.values(map)) {
  const d = local.split('/')[2];
  byDir[d] = (byDir[d] ?? 0) + 1;
}
console.log(`\nDONE  ok=${ok}  failed=${failed}`);
console.log('by dir:', byDir);
if (failures.length) console.log('failures:', JSON.stringify(failures, null, 2));
