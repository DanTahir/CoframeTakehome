// Fetches every stylesheet + script referenced by the scraped homepage HTML.
// Usage: node scripts/fetch-refs.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'scrape', 'raw');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const html = await readFile(path.join(RAW, 'index.html'), 'utf8');

const urls = new Set();
for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/gi)) {
  const href = /href="([^"]+)"/i.exec(m[0]);
  if (href) urls.add(href[1]);
}
for (const m of html.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/gi)) {
  urls.add(m[1]);
}

const abs = (u) => (u.startsWith('//') ? 'https:' + u : new URL(u, 'https://www.coframe.com/').href);

await mkdir(path.join(RAW, 'css'), { recursive: true });
await mkdir(path.join(RAW, 'js'), { recursive: true });

const manifest = [];
let i = 0;
for (const u of urls) {
  const full = abs(u);
  const isCss = /\.css(\?|$)/i.test(full);
  const dir = isCss ? 'css' : 'js';
  const base = path.basename(new URL(full).pathname) || `res-${i}`;
  const name = `${String(i).padStart(2, '0')}-${base}`.replace(/[^\w.\-]/g, '_');
  i++;
  try {
    const res = await fetch(full, { headers: { 'user-agent': UA, referer: 'https://www.coframe.com/' } });
    if (!res.ok) {
      console.log(`FAIL ${res.status} ${full}`);
      manifest.push({ url: full, ok: false, status: res.status });
      continue;
    }
    const body = await res.text();
    const file = path.join(RAW, dir, name);
    await writeFile(file, body);
    manifest.push({ url: full, ok: true, file: path.relative(ROOT, file), bytes: body.length });
    console.log(`ok  ${String(body.length).padStart(8)}  ${dir}/${name}`);
  } catch (err) {
    console.log(`ERR ${full} ${err.message}`);
    manifest.push({ url: full, ok: false, error: err.message });
  }
}

await writeFile(path.join(RAW, 'refs.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${manifest.length} refs, ${manifest.filter((m) => m.ok).length} ok`);
