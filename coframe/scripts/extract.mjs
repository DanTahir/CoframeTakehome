/**
 * extract.mjs — splits the scraped homepage into per-section HTML files and
 * pulls every inline <style> embed out into app/styles/embedded/*.css.
 *
 * The Webflow page carries a lot of its design in inline <style> embeds
 * (hero styling, nav theming, fluid-type variables, keyframe animations).
 * Those are as much a part of the design as the main stylesheet, so they are
 * extracted verbatim rather than reimplemented.
 *
 * Usage: node scripts/extract.mjs
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();
const html = await readFile(path.join(ROOT, 'scrape/index.html'), 'utf8');
const $ = cheerio.load(html);

const SECTION_DIR = path.join(ROOT, 'scrape/sections');
const EMBED_DIR = path.join(ROOT, 'app/styles/embedded');
await mkdir(SECTION_DIR, { recursive: true });
await mkdir(EMBED_DIR, { recursive: true });

// ---- inline <style> embeds --------------------------------------------------
const styles = [];
$('style').each((i, el) => {
  const css = $(el).html() || '';
  if (!css.trim()) return;
  // Name the embed after the wrapper div's class when there is one.
  const wrapper = $(el).parent().attr('class') || '';
  const label =
    wrapper
      .split(/\s+/)
      .filter((c) => c && !c.startsWith('w-'))
      .join('-') || `embed-${i}`;
  styles.push({ index: i, label, css: css.trim(), bytes: css.length });
});

const seen = new Map();
for (const s of styles) {
  const n = (seen.get(s.label) || 0) + 1;
  seen.set(s.label, n);
  s.file = `${String(s.index).padStart(2, '0')}-${s.label}${n > 1 ? `-${n}` : ''}.css`;
  await writeFile(
    path.join(EMBED_DIR, s.file),
    `/* Inline <style> embed #${s.index} from www.coframe.com (wrapper: .${s.label}) */\n${s.css}\n`,
    'utf8',
  );
}
await writeFile(
  path.join(EMBED_DIR, 'index.css'),
  `/* Aggregated inline <style> embeds extracted from the live page, in document order. */\n` +
    styles.map((s) => `@import './${s.file}';`).join('\n') +
    '\n',
  'utf8',
);
console.log(`[styles] extracted ${styles.length} inline <style> embeds -> app/styles/embedded/`);
for (const s of styles) console.log(`   ${s.file}  (${s.bytes} bytes)`);

// ---- per-section HTML ------------------------------------------------------
// Drop scripts/styles/noscript so the section files are pure markup.
$('script, noscript, style').remove();

const targets = [
  ['nav', '.nav-wrap'],
  ['hero', 'section#hero'],
  ['introduction', 'section#introduction'],
  ['compare', 'section#compare'],
  ['banner-openai', '.content.cc-homepage > section:nth-of-type(3)'],
  ['how-it-works', 'section#how-it-works'],
  ['features', 'section#features'],
  ['integrations', 'section#integrations'],
  ['security', 'section#security'],
  ['testimonials', 'section#testimonials'],
  ['blog', 'section#blog'],
  ['footer', 'section.footer-container'],
  ['floating-cta', 'a.floating-cta'],
];

for (const [name, selector] of targets) {
  const node = $(selector).first();
  if (!node.length) {
    console.warn(`[sections] !! no match for ${name} (${selector})`);
    continue;
  }
  const out = $.html(node);
  await writeFile(path.join(SECTION_DIR, `${name}.html`), out, 'utf8');
  console.log(`[sections] ${name}.html  (${out.length} bytes)`);
}

// ---- link inventory -------------------------------------------------------
const links = new Map();
$('a[href]').each((_, el) => {
  const href = ($(el).attr('href') || '').trim();
  const text = $(el).text().replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!links.has(href)) links.set(href, text);
});
await writeFile(
  path.join(ROOT, 'scrape/links.json'),
  JSON.stringify(Object.fromEntries(links), null, 2),
  'utf8',
);
console.log(`[links] ${links.size} unique hrefs -> scrape/links.json`);
