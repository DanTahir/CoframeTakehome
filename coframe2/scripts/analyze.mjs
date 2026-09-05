// Compact structural report on the scraped homepage: top-level sections, links,
// asset URLs, and animation-hook counts. Keeps the raw 237 KB HTML out of the way.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'scrape', 'raw');
const html = await readFile(path.join(RAW, 'index.html'), 'utf8');

const body = /<body([^>]*)>([\s\S]*)<\/body>/i.exec(html);
const bodyAttrs = body[1].trim();
const bodyHtml = body[2];

// --- Walk top-level children of <body> and one level into .content wrappers.
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
function children(fragment) {
  const out = [];
  let i = 0;
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  let depth = 0;
  let start = null;
  let startTag = null;
  let m;
  while ((m = re.exec(fragment))) {
    const [full, close, tag, attrs, selfClose] = m;
    if (tag === 'script' || tag === 'style') {
      if (!close && !selfClose) {
        const end = fragment.indexOf(`</${tag}>`, re.lastIndex);
        if (end !== -1) re.lastIndex = end + tag.length + 3;
      }
      continue;
    }
    if (VOID.has(tag.toLowerCase()) || selfClose) {
      if (depth === 0) out.push({ tag, attrs: attrs.trim(), html: full });
      continue;
    }
    if (!close) {
      if (depth === 0) { start = m.index; startTag = { tag, attrs: attrs.trim() }; }
      depth++;
    } else {
      depth--;
      if (depth === 0 && start !== null) {
        out.push({ ...startTag, html: fragment.slice(start, re.lastIndex) });
        start = null;
      }
    }
    i++;
  }
  return out;
}

const attr = (attrs, name) => new RegExp(`${name}="([^"]*)"`).exec(attrs)?.[1] ?? '';

const lines = [];
lines.push(`BODY ATTRS: ${bodyAttrs}`);
lines.push('');
lines.push('=== TOP-LEVEL BODY CHILDREN ===');
const top = children(bodyHtml);
for (const c of top) {
  const cls = attr(c.attrs, 'class');
  const id = attr(c.attrs, 'id');
  lines.push(`<${c.tag}${id ? ' #' + id : ''}${cls ? ' .' + cls.split(/\s+/).join('.') : ''}>  ${c.html.length}B`);
  // one level deeper for wrappers
  if (/content|main|page-wrapper/.test(cls) || c.tag === 'main') {
    const inner = /^<[^>]+>([\s\S]*)<\/[a-zA-Z][\w-]*>$/.exec(c.html);
    if (inner) {
      for (const g of children(inner[1])) {
        const gcls = attr(g.attrs, 'class');
        const gid = attr(g.attrs, 'id');
        lines.push(`    <${g.tag}${gid ? ' #' + gid : ''}${gcls ? ' .' + gcls.split(/\s+/).join('.') : ''}>  ${g.html.length}B`);
      }
    }
  }
}

lines.push('');
lines.push('=== UNIQUE LINK TARGETS ===');
const hrefs = new Map();
for (const m of bodyHtml.matchAll(/<a[^>]+href="([^"]*)"[^>]*>/g)) {
  hrefs.set(m[1], (hrefs.get(m[1]) ?? 0) + 1);
}
for (const [h, n] of [...hrefs].sort((a, b) => b[1] - a[1])) lines.push(`${String(n).padStart(3)}x  ${h}`);

lines.push('');
lines.push('=== ANIMATION HOOKS ===');
const hooks = {
  'fade-in elements': /class="[^"]*\bfade-in\b[^"]*"/g,
  'cursor-animation blocks': /class="cursor-animation"/g,
  'cursor elements': /class="cursor"/g,
  'data-w-id': /data-w-id="/g,
  'swiper containers': /class="swiper /g,
  'swiper slides': /class="swiper-slide/g,
  'rive containers': /data-animation-type="rive"/g,
  'tab panes': /w-tab-pane/g,
  'dropdowns': /nav__dropdown-toggle/g,
  'marquee': /logo-marquee__animation-container/g,
  'retype headings': /data-retype-text="true"/g,
};
for (const [k, re] of Object.entries(hooks)) lines.push(`${String((bodyHtml.match(re) ?? []).length).padStart(4)}  ${k}`);

lines.push('');
lines.push('=== RIVE CONTAINERS (full attrs) ===');
for (const m of bodyHtml.matchAll(/<div[^>]*data-animation-type="rive"[^>]*>/g)) lines.push(m[0]);

lines.push('');
lines.push('=== UNIQUE ASSET HOSTS ===');
const hosts = new Map();
for (const m of html.matchAll(/https?:\/\/([a-z0-9.\-]+)\/[^"')\s]+/gi)) {
  hosts.set(m[1], (hosts.get(m[1]) ?? 0) + 1);
}
for (const [h, n] of [...hosts].sort((a, b) => b[1] - a[1])) lines.push(`${String(n).padStart(4)}x  ${h}`);

const report = lines.join('\n');
await writeFile(path.join(ROOT, 'scrape', 'structure.txt'), report);
console.log(report);
