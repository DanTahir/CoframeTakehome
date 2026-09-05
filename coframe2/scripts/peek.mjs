// Prints the opening tag + a short preview of each top-level <body> child, so the
// purpose of every block (incl. the large trailing <div>) can be identified.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const html = await readFile(path.join(ROOT, 'scrape', 'raw', 'index.html'), 'utf8');
const bodyHtml = /<body([^>]*)>([\s\S]*)<\/body>/i.exec(html)[2];

const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
function topLevel(fragment) {
  const out = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  let depth = 0, start = null, startTag = null, m;
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
  }
  return out;
}

const nodes = topLevel(bodyHtml);
nodes.forEach((n, i) => {
  console.log(`\n########## [${i}] <${n.tag} ${n.attrs}>   ${n.html.length}B`);
  const inner = n.html.replace(/^<[^>]+>/, '');
  console.log('PREVIEW: ' + inner.slice(0, 700).replace(/\s+/g, ' '));
  // class histogram to characterize the block
  const classes = new Map();
  for (const m of n.html.matchAll(/class="([^"]+)"/g))
    for (const c of m[1].split(/\s+/)) classes.set(c, (classes.get(c) ?? 0) + 1);
  const topClasses = [...classes].sort((a, b) => b[1] - a[1]).slice(0, 18);
  console.log('CLASSES: ' + topClasses.map(([c, k]) => `${c}(${k})`).join(' '));
});
