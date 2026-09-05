/**
 * dump-scripts.mjs — writes every INLINE <script> from the scraped homepage to
 * scrape/scripts/*.js so the behaviour (cursor animation, letter/text-replace
 * effect, fade-in observer, swiper init, nav dropdown) can be reimplemented in
 * React. External analytics scripts are listed but not downloaded.
 *
 * Usage: node scripts/dump-scripts.mjs [--list]
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'scrape/scripts');
await mkdir(OUT, { recursive: true });

const html = await readFile(path.join(ROOT, 'scrape/index.html'), 'utf8');
const $ = cheerio.load(html);

// Third-party tags we deliberately do not replicate.
const ANALYTICS =
  /posthog|heap|segment|gtag|gtm|googletagmanager|amplitude|intellimize|reb2b|unifyintent|doubleclick|oaiq|cal\.com|mathjax|jquery|webflow\.|cofra\.me|swiper-bundle|fancybox|webfont/i;

const inline = [];
$('script').each((i, el) => {
  const src = $(el).attr('src');
  const code = $(el).html() || '';
  if (src) return;
  if (!code.trim()) return;
  if (ANALYTICS.test(code) && code.length < 4000) return;
  const wrapper = $(el).parent().attr('class') || '';
  const label =
    wrapper
      .split(/\s+/)
      .filter((c) => c && !c.startsWith('w-'))
      .join('-') || `inline-${i}`;
  inline.push({ index: i, label, code: code.trim(), bytes: code.length });
});

const seen = new Map();
for (const s of inline) {
  const n = (seen.get(s.label) || 0) + 1;
  seen.set(s.label, n);
  const file = `${String(s.index).padStart(2, '0')}-${s.label}${n > 1 ? `-${n}` : ''}.js`;
  await writeFile(path.join(OUT, file), s.code, 'utf8');
  console.log(`${file}  (${s.bytes} bytes)`);
}
console.log(`\n[dump] ${inline.length} inline scripts -> scrape/scripts/`);
