#!/usr/bin/env node
/**
 * coframe3 asset scraper.
 *
 * Stage 1: read scrape/raw/index.html, pull out every external reference
 *          (css, js, img, video, srcset, inline url(), .riv, wasm).
 * Stage 2: download each one into scrape/raw/<kind>/ and mirror into
 *          public/assets/<kind>/, recording a URL -> local path map.
 * Stage 3: recurse one level into downloaded CSS/JS for url() refs
 *          (fonts + sprites live there).
 *
 * Idempotent: existing files are skipped unless --force.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'scrape', 'raw');
const PUBLIC = path.join(ROOT, 'public', 'assets');
const MAP_FILE = path.join(ROOT, 'scrape', 'asset-map.json');
const FORCE = process.argv.includes('--force');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const EXT_KIND = {
  '.css': 'css',
  '.js': 'js',
  '.mjs': 'js',
  '.woff': 'fonts',
  '.woff2': 'fonts',
  '.ttf': 'fonts',
  '.otf': 'fonts',
  '.eot': 'fonts',
  '.png': 'img',
  '.jpg': 'img',
  '.jpeg': 'img',
  '.gif': 'img',
  '.webp': 'img',
  '.avif': 'img',
  '.svg': 'img',
  '.ico': 'img',
  '.mp4': 'video',
  '.webm': 'video',
  '.mov': 'video',
  '.m4v': 'video',
  '.riv': 'rive',
  '.wasm': 'rive',
  '.json': 'data',
  '.txt': 'data',
  '.xml': 'data',
};

function kindOf(url) {
  const clean = url.split('?')[0].split('#')[0];
  return EXT_KIND[path.extname(clean).toLowerCase()] ?? 'other';
}

/** Stable, collision-free, human-readable local filename for a URL. */
function localName(url) {
  const clean = url.split('?')[0].split('#')[0];
  let base = decodeURIComponent(path.basename(clean)) || 'index';
  base = base.replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-');
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 8);
  const ext = path.extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;
  return `${stem.slice(0, 60)}.${hash}${ext}`;
}

function absolutize(ref, baseUrl) {
  try {
    return new URL(ref, baseUrl).href;
  } catch {
    return null;
  }
}

const SKIP_HOST = /googletagmanager|google-analytics|hotjar|intellimize|hs-scripts|hubspot|doubleclick|facebook|linkedin|twitter\.com|segment|posthog|sentry|clearbit|rb2b|vitals\.vercel/i;

function isWanted(url) {
  if (!/^https?:/i.test(url)) return false;
  if (SKIP_HOST.test(url)) return false;
  return true;
}

/** Extract candidate refs from an HTML document. */
function refsFromHtml(html, baseUrl) {
  const out = new Set();
  const add = (ref) => {
    if (!ref) return;
    const trimmed = ref.trim().replace(/^['"]|['"]$/g, '');
    if (!trimmed || trimmed.startsWith('data:')) return;
    const abs = absolutize(trimmed, baseUrl);
    if (abs && isWanted(abs)) out.add(abs);
  };

  for (const m of html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi)) {
    if (/rel=["']?(stylesheet|icon|apple-touch-icon|preload)/i.test(m[0])) add(m[1]);
  }
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/<(?:img|source|video|audio|embed)[^>]+(?:src|poster)=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(',')) add(part.trim().split(/\s+/)[0]);
  }
  // inline styles + inline <style> blocks + inline script string literals
  for (const m of html.matchAll(/url\((["']?)([^"')]+)\1\)/gi)) add(m[2]);
  for (const m of html.matchAll(/["'](https?:\/\/[^"'\s]+\.(?:riv|wasm|woff2?|mp4|webm|json))["']/gi)) add(m[1]);
  return [...out];
}

/** Extract url() + explicit asset URLs from CSS or JS text. */
function refsFromText(text, baseUrl) {
  const out = new Set();
  const add = (ref) => {
    if (!ref) return;
    const trimmed = ref.trim().replace(/^['"]|['"]$/g, '');
    if (!trimmed || trimmed.startsWith('data:')) return;
    const abs = absolutize(trimmed, baseUrl);
    if (abs && isWanted(abs)) out.add(abs);
  };
  for (const m of text.matchAll(/url\((["']?)([^"')]+)\1\)/gi)) add(m[2]);
  for (const m of text.matchAll(/["'](https?:\/\/[^"'\s]+\.(?:riv|wasm|woff2?|ttf|otf|mp4|webm|png|jpe?g|webp|svg|gif))["']/gi)) add(m[1]);
  return [...out];
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function download(url) {
  const kind = kindOf(url);
  const name = localName(url);
  const rawDir = path.join(RAW, kind);
  const pubDir = path.join(PUBLIC, kind);
  await mkdir(rawDir, { recursive: true });
  await mkdir(pubDir, { recursive: true });
  const rawPath = path.join(rawDir, name);
  const pubPath = path.join(pubDir, name);

  if (!FORCE && (await exists(rawPath))) {
    const buf = await readFile(rawPath);
    if (!(await exists(pubPath))) await writeFile(pubPath, buf);
    return { url, kind, name, bytes: buf.length, cached: true, buf };
  }

  const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://www.coframe.com/' } });
  if (!res.ok) return { url, kind, name, error: `HTTP ${res.status}` };
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(rawPath, buf);
  await writeFile(pubPath, buf);
  return { url, kind, name, bytes: buf.length, buf };
}

async function main() {
  const baseUrl = 'https://www.coframe.com/';
  const html = await readFile(path.join(RAW, 'index.html'), 'utf8');

  const queue = refsFromHtml(html, baseUrl);
  console.log(`stage 1: ${queue.length} refs from index.html`);

  const map = {};
  const errors = [];
  const seen = new Set();

  // Round 1: everything referenced by the HTML.
  const round1 = [];
  for (const url of queue) {
    if (seen.has(url)) continue;
    seen.add(url);
    const r = await download(url);
    if (r.error) errors.push(r);
    else {
      map[url] = `/assets/${r.kind}/${r.name}`;
      round1.push(r);
      console.log(`  [${r.kind}] ${r.name} ${r.cached ? '(cached)' : `${r.bytes}b`}`);
    }
  }

  // Round 2: recurse into text assets (css/js) for fonts, sprites, .riv, wasm.
  const nested = new Set();
  for (const r of round1) {
    if (r.kind !== 'css' && r.kind !== 'js') continue;
    const text = r.buf.toString('utf8');
    for (const ref of refsFromText(text, r.url)) nested.add(ref);
  }
  console.log(`stage 3: ${nested.size} nested refs from css/js`);
  for (const url of nested) {
    if (seen.has(url)) continue;
    seen.add(url);
    const r = await download(url);
    if (r.error) errors.push(r);
    else {
      map[url] = `/assets/${r.kind}/${r.name}`;
      console.log(`  [${r.kind}] ${r.name} ${r.cached ? '(cached)' : `${r.bytes}b`}`);
    }
  }

  await mkdir(path.dirname(MAP_FILE), { recursive: true });
  await writeFile(MAP_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, map, errors }, null, 2));

  const byKind = {};
  for (const local of Object.values(map)) {
    const k = local.split('/')[2];
    byKind[k] = (byKind[k] ?? 0) + 1;
  }
  console.log('\n--- summary ---');
  console.log(`assets mapped: ${Object.keys(map).length}`);
  console.log(byKind);
  if (errors.length) {
    console.log(`errors: ${errors.length}`);
    for (const e of errors) console.log(`  ${e.error} ${e.url}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
