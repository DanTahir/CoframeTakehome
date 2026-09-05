// Dumps every inline <script> and <style> block from the scraped homepage into
// scrape/raw/inline/ so the original animation implementations can be read directly.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'scrape', 'raw');
const OUT = path.join(RAW, 'inline');
await mkdir(OUT, { recursive: true });

const html = await readFile(path.join(RAW, 'index.html'), 'utf8');

const index = [];

// Inline scripts (no src attribute).
let i = 0;
for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const attrs = m[1];
  const body = m[2];
  if (/\ssrc=/i.test(attrs)) continue;
  if (!body.trim()) continue;
  // Guess a label from the first meaningful identifiers in the block.
  const hint =
    /class\s+(\w+)/.exec(body)?.[1] ||
    /function\s+(\w+)/.exec(body)?.[1] ||
    /['"]([\w-]{4,40})['"]/.exec(body)?.[1] ||
    'block';
  const name = `${String(i).padStart(2, '0')}-${hint}`.replace(/[^\w.\-]/g, '_') + '.js';
  await writeFile(path.join(OUT, name), body);
  index.push({ kind: 'script', order: i, attrs: attrs.trim(), file: `inline/${name}`, bytes: body.length, offset: m.index });
  i++;
}

// Inline styles.
let j = 0;
for (const m of html.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/gi)) {
  const body = m[2];
  if (!body.trim()) continue;
  const name = `style-${String(j).padStart(2, '0')}.css`;
  await writeFile(path.join(OUT, name), body);
  index.push({ kind: 'style', order: j, attrs: m[1].trim(), file: `inline/${name}`, bytes: body.length, offset: m.index });
  j++;
}

await writeFile(path.join(RAW, 'inline-index.json'), JSON.stringify(index, null, 2));
for (const e of index) console.log(`${e.kind.padEnd(6)} ${String(e.bytes).padStart(7)}  ${e.file}`);
console.log(`\n${i} inline scripts, ${j} inline styles`);
