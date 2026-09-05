#!/usr/bin/env node
/**
 * HTML -> TSX codegen for the coframe.com homepage replica.
 *
 * Reads scrape/raw/index.html and emits, deterministically:
 *
 *   app/sections/generated/<Name>.tsx   one component per top-level block
 *   app/sections/generated/PageBody.tsx composition in exact document order
 *   app/sections/generated/index.ts     barrel
 *   app/sections/generated/manifest.json facts the test suite asserts against
 *   app/styles/embedded.css             every inline <style>, document order
 *   app/styles/{webflow,fancybox,swiper}.css  rewritten to local asset paths
 *
 * Design notes
 * ------------
 * - Every text node is emitted as a JS string literal expression ({"..."}).
 *   JSX collapses/trims literal whitespace around newlines, which would
 *   silently change inline layout; string literals are unambiguous and keep
 *   entities like U+00A0 byte-exact.
 * - <script> elements are dropped (behaviour is ported to typed modules under
 *   app/lib), but their Webflow wrapper divs are kept because CSS targets them.
 * - <style> elements are extracted in document order and dropped in place.
 * - Any attribute value that exactly matches a scraped asset URL is rewritten
 *   to its local /assets/... path, so the replica makes zero remote requests.
 * - Root-relative and coframe.com links are normalised to absolute
 *   https://www.coframe.com/... URLs so every link leaves the replica and
 *   lands on the real site, per the brief. Same-page #anchors stay local.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW_HTML = path.join(ROOT, 'scrape', 'raw', 'index.html');
const ASSET_MAP = path.join(ROOT, 'scrape', 'asset-map.json');
const RAW_CSS_DIR = path.join(ROOT, 'scrape', 'raw', 'css');
const OUT_SECTIONS = path.join(ROOT, 'app', 'sections', 'generated');
const OUT_STYLES = path.join(ROOT, 'app', 'styles');

const SITE = 'https://www.coframe.com';

// ---------------------------------------------------------------------------
// parse5 helpers
// ---------------------------------------------------------------------------
const isEl = (n) => Boolean(n.tagName);
const isText = (n) => n.nodeName === '#text';
const kids = (n) => (n.childNodes ?? []).filter(isEl);
const attrOf = (n, name) => n.attrs?.find((a) => a.name === name)?.value;
const classesOf = (n) => (attrOf(n, 'class') ?? '').trim().split(/\s+/).filter(Boolean);

function findAll(node, pred, acc = []) {
  if (isEl(node) && pred(node)) acc.push(node);
  for (const c of node.childNodes ?? []) findAll(c, pred, acc);
  return acc;
}

function countElements(node) {
  return findAll(node, () => true).length;
}

// ---------------------------------------------------------------------------
// URL rewriting
// ---------------------------------------------------------------------------
let assetMap = {};

/** Exact-match rewrite of a scraped asset URL to its local public path. */
function localAsset(url) {
  const direct = assetMap[url];
  if (direct) return direct;
  // Tolerate the protocol-relative and http variants of the same asset.
  for (const alt of [url.replace(/^http:/, 'https:'), `https:${url}`]) {
    if (assetMap[alt]) return assetMap[alt];
  }
  return null;
}

/** Rewrite any asset URLs appearing inside a free-text value (style, srcset). */
function rewriteUrlsInText(text) {
  let out = text;
  for (const [remote, local] of Object.entries(assetMap)) {
    if (out.includes(remote)) out = out.split(remote).join(local);
  }
  return out;
}

const ASSETY_ATTRS = new Set(['src', 'poster', 'data-rive-url', 'content', 'data-src']);

/**
 * Normalise a link target.
 *  - "/x", "" and coframe.com URLs  -> absolute https://www.coframe.com/x
 *  - "#anchor"                      -> unchanged (same-page scroll)
 *  - external / mailto / tel        -> unchanged
 */
function rewriteHref(value) {
  const v = value.trim();
  if (!v) return SITE + '/';
  if (v.startsWith('#')) return v;
  if (/^(mailto:|tel:|javascript:)/i.test(v)) return v;
  if (v.startsWith('//')) return `https:${v}`;
  if (/^https?:\/\//i.test(v)) {
    // Point coframe.com-relative absolutes at the canonical www host.
    return v.replace(/^https?:\/\/(www\.)?coframe\.com/i, SITE);
  }
  if (v.startsWith('/')) return SITE + v;
  return `${SITE}/${v}`;
}

// ---------------------------------------------------------------------------
// HTML attribute name -> React prop name
// ---------------------------------------------------------------------------
const ATTR_RENAME = {
  class: 'className',
  for: 'htmlFor',
  srcset: 'srcSet',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  minlength: 'minLength',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  autoplay: 'autoPlay',
  playsinline: 'playsInline',
  crossorigin: 'crossOrigin',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  usemap: 'useMap',
  frameborder: 'frameBorder',
  allowfullscreen: 'allowFullScreen',
  contenteditable: 'contentEditable',
  spellcheck: 'spellCheck',
  novalidate: 'noValidate',
  enctype: 'encType',
  acceptcharset: 'acceptCharset',
  datetime: 'dateTime',
  hreflang: 'hrefLang',
  referrerpolicy: 'referrerPolicy',
  // SVG
  viewbox: 'viewBox',
  preserveaspectratio: 'preserveAspectRatio',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-opacity': 'strokeOpacity',
  'stroke-miterlimit': 'strokeMiterlimit',
  'fill-rule': 'fillRule',
  'fill-opacity': 'fillOpacity',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'gradientunits': 'gradientUnits',
  'gradienttransform': 'gradientTransform',
  'patternunits': 'patternUnits',
  'maskunits': 'maskUnits',
  'markerwidth': 'markerWidth',
  'markerheight': 'markerHeight',
  'text-anchor': 'textAnchor',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'letter-spacing': 'letterSpacing',
  'xlink:href': 'xlinkHref',
  'xml:space': 'xmlSpace',
};

/** Attributes React treats as booleans when present. */
const BOOLEAN_ATTRS = new Set([
  'disabled', 'checked', 'readOnly', 'required', 'multiple', 'selected',
  'autoFocus', 'autoPlay', 'controls', 'loop', 'muted', 'playsInline',
  'noValidate', 'allowFullScreen', 'default', 'reversed', 'async', 'defer',
  'hidden', 'open', 'itemScope',
]);

/**
 * Props React's TypeScript definitions type as `number`, not `string`.
 * HTML carries them as strings, so they must be emitted as `{256}` rather than
 * `"256"` or `tsc --noEmit` fails with TS2322.
 */
const NUMERIC_ATTRS = new Set([
  'maxLength', 'minLength', 'tabIndex', 'colSpan', 'rowSpan', 'size', 'span',
  'start', 'cols', 'rows', 'min', 'max', 'step',
]);

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr',
]);

/** Elements whose `value`/`checked` must become default* to stay uncontrolled. */
const FORM_VALUE_TAGS = new Set(['input', 'textarea', 'select']);

function cssPropToCamel(prop) {
  const p = prop.trim();
  if (p.startsWith('--')) return p; // CSS custom property: keep verbatim
  if (p.startsWith('-')) {
    // -webkit-foo -> WebkitFoo
    const parts = p.slice(1).split('-');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) +
      parts.slice(1).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  }
  return p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** "color:red;top:0" -> `{{ color: "red", top: "0" }}` source text. */
function styleAttrToObject(value) {
  const entries = [];
  // Split on ';' not inside parentheses (url(...), rgba(...)).
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ';' && depth === 0) {
      entries.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  entries.push(current);

  const pairs = [];
  for (const raw of entries) {
    const decl = raw.trim();
    if (!decl) continue;
    const idx = decl.indexOf(':');
    if (idx <= 0) continue;
    const prop = decl.slice(0, idx);
    const val = rewriteUrlsInText(decl.slice(idx + 1).trim());
    const key = cssPropToCamel(prop);
    const keySrc = /^[A-Za-z][A-Za-z0-9]*$/.test(key) ? key : JSON.stringify(key);
    pairs.push(`${keySrc}: ${JSON.stringify(val)}`);
  }
  return pairs.length ? `{{ ${pairs.join(', ')} }}` : null;
}

function rewriteSrcset(value) {
  return value
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return null;
      const [url, ...rest] = trimmed.split(/\s+/);
      const local = localAsset(url) ?? url;
      return [local, ...rest].join(' ');
    })
    .filter(Boolean)
    .join(', ');
}

// ---------------------------------------------------------------------------
// JSX serialisation
// ---------------------------------------------------------------------------
const stats = {
  dropped: { script: 0, style: 0, comment: 0, noscript: 0 },
  rewritten: { asset: 0, href: 0 },
  fadeIn: 0,
  swiperRoots: 0,
  swiperSlides: 0,
  tabPanes: 0,
  dropdowns: 0,
  canvases: 0,
  riveTargets: 0,
  cursorAnimations: 0,
  retypeTargets: 0,
  images: 0,
  links: 0,
};

function serializeAttrs(node) {
  const out = [];
  for (const { name, value } of node.attrs ?? []) {
    if (name === 'style') {
      const obj = styleAttrToObject(value);
      if (obj) out.push(`style=${obj}`);
      continue;
    }

    let propName = ATTR_RENAME[name] ?? name;
    // Unknown mixed-case/namespaced attributes React can't map: keep data-*/aria-*
    // verbatim, and lowercase everything else it would warn about.
    let propValue = value;

    if (name === 'srcset') {
      propValue = rewriteSrcset(value);
      stats.rewritten.asset += 1;
    } else if (name === 'href') {
      // <a href> and <link href> both land here; only anchors need site rewriting.
      const local = localAsset(value);
      if (local) {
        propValue = local;
        stats.rewritten.asset += 1;
      } else {
        propValue = rewriteHref(value);
        stats.rewritten.href += 1;
      }
    } else if (ASSETY_ATTRS.has(name)) {
      const local = localAsset(value);
      if (local) {
        propValue = local;
        stats.rewritten.asset += 1;
      }
    }

    if (FORM_VALUE_TAGS.has(node.tagName)) {
      if (propName === 'value') propName = 'defaultValue';
      if (propName === 'checked') propName = 'defaultChecked';
    }

    if (BOOLEAN_ATTRS.has(propName)) {
      out.push(propValue === 'false' ? `${propName}={false}` : `${propName}`);
      continue;
    }

    // `width`/`height` are numeric on <img>/<canvas> but strings on SVG, where
    // they may carry units ("100%"), so only coerce when the value is numeric.
    if (NUMERIC_ATTRS.has(propName) && /^-?\d+(\.\d+)?$/.test(propValue.trim())) {
      out.push(`${propName}={${propValue.trim()}}`);
      continue;
    }

    out.push(`${propName}=${JSON.stringify(propValue)}`);
  }
  return out;
}

function collectStats(node) {
  const cls = classesOf(node);
  if (cls.includes('fade-in')) stats.fadeIn += 1;
  if (cls.includes('swiper')) stats.swiperRoots += 1;
  if (cls.includes('swiper-slide')) stats.swiperSlides += 1;
  if (cls.includes('w-tab-pane')) stats.tabPanes += 1;
  if (cls.includes('nav-dropdown')) stats.dropdowns += 1;
  if (cls.includes('cursor-animation')) stats.cursorAnimations += 1;
  if (node.tagName === 'canvas') stats.canvases += 1;
  if (attrOf(node, 'data-rive-url')) stats.riveTargets += 1;
  if (attrOf(node, 'data-retype-text') === 'true') stats.retypeTargets += 1;
  if (node.tagName === 'img') stats.images += 1;
  if (node.tagName === 'a') stats.links += 1;
}

const inlineStyles = [];

/** Serialise a parse5 node subtree to JSX source lines. */
function toJsx(node, depth, lines) {
  const pad = '  '.repeat(depth);

  if (isText(node)) {
    const text = node.value ?? '';
    if (text === '') return;
    lines.push(`${pad}{${JSON.stringify(text)}}`);
    return;
  }

  if (node.nodeName === '#comment') {
    stats.dropped.comment += 1;
    return;
  }

  if (!isEl(node)) return;

  const tag = node.tagName;

  if (tag === 'script') {
    // Behaviour is reimplemented in typed modules under app/lib.
    stats.dropped.script += 1;
    return;
  }
  if (tag === 'style') {
    inlineStyles.push(
      (node.childNodes ?? []).filter(isText).map((t) => t.value).join(''),
    );
    stats.dropped.style += 1;
    return;
  }
  if (tag === 'noscript') {
    stats.dropped.noscript += 1;
    return;
  }

  collectStats(node);

  const attrs = serializeAttrs(node);
  const children = (node.childNodes ?? []).filter(
    (c) => isEl(c) || (isText(c) && (c.value ?? '') !== ''),
  );

  const attrsInline = attrs.length ? ' ' + attrs.join(' ') : '';
  const isVoid = VOID_ELEMENTS.has(tag);

  if (isVoid || children.length === 0) {
    if (attrsInline.length > 100) {
      lines.push(`${pad}<${tag}`);
      for (const a of attrs) lines.push(`${pad}  ${a}`);
      lines.push(`${pad}/>`);
    } else {
      lines.push(`${pad}<${tag}${attrsInline} />`);
    }
    return;
  }

  if (attrsInline.length > 100) {
    lines.push(`${pad}<${tag}`);
    for (const a of attrs) lines.push(`${pad}  ${a}`);
    lines.push(`${pad}>`);
  } else {
    lines.push(`${pad}<${tag}${attrsInline}>`);
  }
  for (const c of children) toJsx(c, depth + 1, lines);
  lines.push(`${pad}</${tag}>`);
}

// ---------------------------------------------------------------------------
// Component naming
// ---------------------------------------------------------------------------
function pascal(input) {
  const cleaned = input.replace(/[^A-Za-z0-9]+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

const IGNORED_CLASSES = new Set([
  'section', 'w-inline-block', 'w-nav', 'w-embed', 'w-script', 'cc-homepage',
  'cc-section-full-width', 'cc-section-dark', 'cc-overflow-visible',
]);

function componentName(node, usedNames, index) {
  const id = attrOf(node, 'id');
  let base = '';
  if (id) base = pascal(id);
  if (!base) {
    const cls = classesOf(node).filter((c) => !IGNORED_CLASSES.has(c));
    if (cls.length) base = pascal(cls[0]);
  }
  if (!base) base = pascal(node.tagName);
  if (!base) base = 'Block';
  if (!/Section$/.test(base)) base += 'Section';

  let name = base;
  let n = 2;
  while (usedNames.has(name)) {
    name = `${base}${n}`;
    n += 1;
  }
  usedNames.add(name);
  return name;
}

// ---------------------------------------------------------------------------
// CSS rewriting
// ---------------------------------------------------------------------------
async function rewriteCss() {
  const files = [
    ['coframe-d4f597.webflow.shared.284bf7c4c.min.bb679e66.css', 'webflow.css'],
    ['fancybox.60b0c822.css', 'fancybox.css'],
    ['swiper-bundle.min.ad3413e1.css', 'swiper.css'],
  ];
  const results = [];
  for (const [src, dest] of files) {
    const raw = await readFile(path.join(RAW_CSS_DIR, src), 'utf8');
    const rewritten = rewriteUrlsInText(raw);
    const remaining = (rewritten.match(/https?:\/\/cdn\.prod\.website-files\.com/g) ?? []).length;
    const header =
      `/* Vendored from coframe.com (${src}).\n` +
      ` * url() references rewritten to local /assets paths by scripts/codegen.mjs.\n` +
      ` * Do not edit by hand — regenerate with \`npm run codegen\`.\n */\n`;
    await writeFile(path.join(OUT_STYLES, dest), header + rewritten);
    results.push({ src, dest, bytes: rewritten.length, unresolvedCdnRefs: remaining });
  }
  return results;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  assetMap = JSON.parse(await readFile(ASSET_MAP, 'utf8')).map;
  const html = await readFile(RAW_HTML, 'utf8');
  const doc = parse(html);

  await mkdir(OUT_SECTIONS, { recursive: true });
  await mkdir(OUT_STYLES, { recursive: true });

  const htmlEl = findAll(doc, (n) => n.tagName === 'html')[0];
  const head = findAll(doc, (n) => n.tagName === 'head')[0];
  const body = findAll(doc, (n) => n.tagName === 'body')[0];

  // Head <style> blocks come first in document order.
  for (const st of kids(head).filter((n) => n.tagName === 'style')) {
    inlineStyles.push((st.childNodes ?? []).filter(isText).map((t) => t.value).join(''));
    stats.dropped.style += 1;
  }

  const bodyClasses = classesOf(body).filter((c) => c !== 'anti-flicker');
  const htmlLang = attrOf(htmlEl, 'lang') ?? 'en';

  // Which top-level nodes get split into per-child components?
  const topNodes = kids(body).filter((n) => n.tagName !== 'script' && n.tagName !== 'noscript');
  const shouldSplit = (n) =>
    kids(n).length >= 5 && kids(n).filter((c) => c.tagName === 'section').length >= 3;

  const usedNames = new Set();
  const components = []; // { name, node, selector }
  const composition = []; // entries describing PageBody structure

  topNodes.forEach((node, i) => {
    if (shouldSplit(node)) {
      const childNames = [];
      kids(node).forEach((child, j) => {
        const name = componentName(child, usedNames, j);
        components.push({ name, node: child });
        childNames.push(name);
      });
      composition.push({ kind: 'wrapper', node, childNames });
    } else {
      const name = componentName(node, usedNames, i);
      components.push({ name, node });
      composition.push({ kind: 'component', name });
    }
  });

  // --- emit section components ------------------------------------------
  const manifestSections = [];
  for (const { name, node } of components) {
    const lines = [];
    toJsx(node, 3, lines);
    const cls = classesOf(node);
    const id = attrOf(node, 'id');
    const selector = `${node.tagName}${id ? `#${id}` : ''}${cls.map((c) => `.${c}`).join('')}`;

    const src =
      `// GENERATED FILE — do not edit by hand.\n` +
      `// Source: coframe.com homepage, ${selector}\n` +
      `// Regenerate with \`npm run codegen\`.\n\n` +
      `export default function ${name}() {\n` +
      `  return (\n` +
      lines.join('\n') +
      `\n  );\n}\n`;

    await writeFile(path.join(OUT_SECTIONS, `${name}.tsx`), src);
    manifestSections.push({ name, selector, elements: countElements(node) });
  }

  // --- emit PageBody ----------------------------------------------------
  const importNames = components.map((c) => c.name);
  const pbLines = [];
  pbLines.push('// GENERATED FILE — do not edit by hand.');
  pbLines.push('// Composes every homepage block in exact source document order.');
  pbLines.push('// Regenerate with `npm run codegen`.');
  pbLines.push('');
  for (const n of importNames) pbLines.push(`import ${n} from './${n}';`);
  pbLines.push('');
  pbLines.push('export default function PageBody() {');
  pbLines.push('  return (');
  pbLines.push('    <>');
  for (const entry of composition) {
    if (entry.kind === 'component') {
      pbLines.push(`      <${entry.name} />`);
    } else {
      const attrs = serializeAttrs(entry.node);
      const attrsInline = attrs.length ? ' ' + attrs.join(' ') : '';
      pbLines.push(`      <${entry.node.tagName}${attrsInline}>`);
      for (const cn of entry.childNames) pbLines.push(`        <${cn} />`);
      pbLines.push(`      </${entry.node.tagName}>`);
    }
  }
  pbLines.push('    </>');
  pbLines.push('  );');
  pbLines.push('}');
  await writeFile(path.join(OUT_SECTIONS, 'PageBody.tsx'), pbLines.join('\n') + '\n');

  // --- barrel -----------------------------------------------------------
  const barrel =
    `// GENERATED FILE — do not edit by hand.\n\n` +
    importNames.map((n) => `export { default as ${n} } from './${n}';`).join('\n') +
    `\nexport { default as PageBody } from './PageBody';\n`;
  await writeFile(path.join(OUT_SECTIONS, 'index.ts'), barrel);

  // --- embedded css -----------------------------------------------------
  const embedded =
    `/* Every inline <style> block from the coframe.com homepage, concatenated in\n` +
    ` * document order so the cascade matches the original exactly.\n` +
    ` * Generated by scripts/codegen.mjs — regenerate with \`npm run codegen\`.\n */\n\n` +
    inlineStyles
      .map((css, i) => `/* ---- inline style block ${i} ---- */\n${rewriteUrlsInText(css).trim()}\n`)
      .join('\n');
  await writeFile(path.join(OUT_STYLES, 'embedded.css'), embedded);

  const cssResults = await rewriteCss();

  // --- manifest ---------------------------------------------------------
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'scrape/raw/index.html',
    htmlLang,
    bodyClasses,
    sections: manifestSections,
    composition: composition.map((e) =>
      e.kind === 'component'
        ? { kind: 'component', name: e.name }
        : {
            kind: 'wrapper',
            tag: e.node.tagName,
            classes: classesOf(e.node),
            children: e.childNames,
          },
    ),
    inlineStyleBlocks: inlineStyles.length,
    stylesheets: cssResults,
    stats,
  };
  await writeFile(path.join(OUT_SECTIONS, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`sections emitted   : ${manifestSections.length}`);
  for (const s of manifestSections) console.log(`  ${s.name.padEnd(26)} ${String(s.elements).padStart(4)} els  ${s.selector.slice(0, 60)}`);
  console.log(`\ninline style blocks: ${inlineStyles.length}`);
  console.log('stylesheets        :', cssResults.map((c) => `${c.dest}(${c.bytes}b, ${c.unresolvedCdnRefs} unresolved)`).join(', '));
  console.log('stats              :', JSON.stringify(stats, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
