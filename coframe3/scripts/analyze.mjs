#!/usr/bin/env node
/**
 * Structural analysis of the scraped homepage. Writes everything into
 * scrape/analysis/ so the port can be driven by facts instead of guesses:
 *
 *   head-order.txt   ordered <link rel=stylesheet> / inline <style> sequence
 *   style-NN.css     each inline <style> block, in document order
 *   script-NN.js     each inline <script> block, in document order
 *   body-tree.txt    body DOM outline (tag.class) down to --depth
 *   sections.txt     top-level section list with child counts
 *   attrs.txt        census of data-* attributes that drive behaviour
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'scrape', 'raw', 'index.html');
const OUT = path.join(ROOT, 'scrape', 'analysis');

const DEPTH = Number(process.argv.find((a) => a.startsWith('--depth='))?.split('=')[1] ?? 4);

const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value;
const isEl = (node) => Boolean(node.tagName);
const kids = (node) => (node.childNodes ?? []).filter(isEl);

function textOf(node) {
  if (node.nodeName === '#text') return node.value ?? '';
  return (node.childNodes ?? []).map(textOf).join('');
}

function find(node, pred, acc = []) {
  if (isEl(node) && pred(node)) acc.push(node);
  for (const c of node.childNodes ?? []) find(c, pred, acc);
  return acc;
}

function label(node) {
  const cls = attr(node, 'class');
  const id = attr(node, 'id');
  let s = node.tagName;
  if (id) s += `#${id}`;
  if (cls) s += `.${cls.trim().split(/\s+/).join('.')}`;
  return s;
}

function outline(node, depth, maxDepth, lines) {
  if (depth > maxDepth) return;
  const indent = '  '.repeat(depth);
  const children = kids(node);
  const txt = textOf(node).trim().replace(/\s+/g, ' ');
  const preview = children.length === 0 && txt ? `  "${txt.slice(0, 70)}"` : '';
  lines.push(`${indent}${label(node)}${preview}`);
  for (const c of children) outline(c, depth + 1, maxDepth, lines);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const html = await readFile(RAW, 'utf8');
  const doc = parse(html);

  const head = find(doc, (n) => n.tagName === 'head')[0];
  const body = find(doc, (n) => n.tagName === 'body')[0];

  // --- head order -------------------------------------------------------
  const headLines = [];
  let styleIdx = 0;
  for (const node of kids(head)) {
    if (node.tagName === 'link' && /stylesheet/i.test(attr(node, 'rel') ?? '')) {
      headLines.push(`LINK  ${attr(node, 'href')}`);
    } else if (node.tagName === 'style') {
      const css = textOf(node);
      const name = `style-${String(styleIdx).padStart(2, '0')}.css`;
      await writeFile(path.join(OUT, name), css);
      headLines.push(`STYLE ${name}  (${css.length} bytes)`);
      styleIdx += 1;
    } else if (node.tagName === 'script') {
      const src = attr(node, 'src');
      headLines.push(src ? `SCRIPT src=${src}` : `SCRIPT inline (${textOf(node).length} bytes)`);
    }
  }
  await writeFile(path.join(OUT, 'head-order.txt'), headLines.join('\n'));

  // --- inline styles anywhere in the document ---------------------------
  const allStyles = find(doc, (n) => n.tagName === 'style');
  for (const [i, node] of allStyles.entries()) {
    await writeFile(path.join(OUT, `all-style-${String(i).padStart(2, '0')}.css`), textOf(node));
  }

  // --- inline scripts ---------------------------------------------------
  const scripts = find(doc, (n) => n.tagName === 'script' && !attr(n, 'src'));
  for (const [i, node] of scripts.entries()) {
    await writeFile(path.join(OUT, `script-${String(i).padStart(2, '0')}.js`), textOf(node));
  }

  // --- body outline -----------------------------------------------------
  const lines = [];
  for (const c of kids(body)) outline(c, 0, DEPTH, lines);
  await writeFile(path.join(OUT, 'body-tree.txt'), lines.join('\n'));

  // --- top-level sections ----------------------------------------------
  const secLines = [];
  const walkTop = (node, prefix = '') => {
    for (const c of kids(node)) {
      const descendants = find(c, () => true).length;
      secLines.push(`${prefix}${label(c)}  [${kids(c).length} children, ${descendants} nodes]`);
    }
  };
  walkTop(body);
  // one level deeper for the main page wrapper
  const wrappers = kids(body).filter((n) => kids(n).length > 3);
  for (const w of wrappers) {
    secLines.push(`\n--- children of ${label(w)} ---`);
    walkTop(w, '  ');
  }
  await writeFile(path.join(OUT, 'sections.txt'), secLines.join('\n'));

  // --- behaviour-driving attribute census ------------------------------
  const census = new Map();
  for (const node of find(doc, () => true)) {
    for (const a of node.attrs ?? []) {
      if (/^(data-|aria-)/.test(a.name) || ['role', 'id'].includes(a.name)) {
        const key = a.name;
        if (!census.has(key)) census.set(key, new Set());
        census.get(key).add(a.value.slice(0, 60));
      }
    }
  }
  const censusLines = [...census.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .map(([k, v]) => `${k}  (${v.size} distinct)\n${[...v].slice(0, 25).map((x) => `    ${x}`).join('\n')}`);
  await writeFile(path.join(OUT, 'attrs.txt'), censusLines.join('\n'));

  console.log('head entries      :', headLines.length);
  console.log('inline <style>    :', allStyles.length);
  console.log('inline <script>   :', scripts.length);
  console.log('body top-level    :', kids(body).length);
  console.log('total elements    :', find(body, () => true).length);
  console.log('\n--- head order ---');
  console.log(headLines.join('\n'));
  console.log('\n--- top-level sections ---');
  console.log(secLines.slice(0, 40).join('\n'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
