/**
 * convert.mjs — turns each scraped section of the coframe.com homepage into a
 * React (TSX) component under app/sections/generated/.
 *
 * Why generate instead of hand-writing? The Webflow markup carries hundreds of
 * structural class names and `data-*` attributes that the site's own animation
 * engine reads at runtime (`data-retype-version-*`, `data-fade-delay`,
 * `data-animation-*`, `data-cursor-position`, `data-label-size`, ...). Any of
 * those dropped by hand would visibly change the design, so the DOM is
 * translated mechanically and faithfully, while behaviour is reimplemented in
 * hand-written client components under app/effects/.
 *
 * Transformations applied:
 *   - Webflow editor/analytics noise removed (data-wf-*, aria-current, etc).
 *   - HTML attrs -> JSX props (class->className, for->htmlFor, SVG dashed
 *     attrs -> camelCase, inline style string -> style object).
 *   - Void elements self-closed; boolean attrs emitted bare.
 *   - Remote CDN asset URLs (src/srcset/data-rive-url) rewritten to the local
 *     /assets/... copies recorded in scrape/asset-map.json.
 *   - Relative hrefs (/blog, /careers, ...) absolutised to
 *     https://www.coframe.com/... so every link goes to the real site.
 *   - Text content escaped for JSX ({ } and stray backticks).
 *
 * Usage: node scripts/convert.mjs
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();
const SECTION_DIR = path.join(ROOT, 'scrape/sections');
const OUT_DIR = path.join(ROOT, 'app/sections/generated');
const SITE = 'https://www.coframe.com';

const assetMap = JSON.parse(await readFile(path.join(ROOT, 'scrape/asset-map.json'), 'utf8'));

/** Sections to convert -> component name. */
const SECTIONS = [
  ['nav', 'NavSection'],
  ['hero', 'HeroSection'],
  ['introduction', 'IntroductionSection'],
  ['compare', 'CompareSection'],
  ['banner-openai', 'OpenAiBannerSection'],
  ['how-it-works', 'HowItWorksSection'],
  ['features', 'FeaturesSection'],
  ['integrations', 'IntegrationsSection'],
  ['security', 'SecuritySection'],
  ['testimonials', 'TestimonialsSection'],
  ['blog', 'BlogSection'],
  ['footer', 'FooterSection'],
  ['floating-cta', 'FloatingCta'],
];

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** Attributes that are pure Webflow-editor / analytics noise. */
const DROP_ATTR = (name) =>
  name.startsWith('data-wf-') ||
  name.startsWith('data-w-') ||
  [
    'aria-current',
    'data-cal-link',
    'data-collapse',
    'data-duration',
    'data-easing',
    'data-easing2',
    'data-no-scroll',
    'data-doc-height',
  ].includes(name);

/** HTML attribute -> JSX prop name. */
const ATTR_RENAME = {
  class: 'className',
  for: 'htmlFor',
  autoplay: 'autoPlay',
  playsinline: 'playsInline',
  novalidate: 'noValidate',
  maxlength: 'maxLength',
  minlength: 'minLength',
  readonly: 'readOnly',
  tabindex: 'tabIndex',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  usemap: 'useMap',
  crossorigin: 'crossOrigin',
  srcset: 'srcSet',
  // SVG
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-opacity': 'strokeOpacity',
  'fill-opacity': 'fillOpacity',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'text-anchor': 'textAnchor',
  'gradientunits': 'gradientUnits',
  'gradienttransform': 'gradientTransform',
  'patternunits': 'patternUnits',
  'maskunits': 'maskUnits',
  'gradientUnits': 'gradientUnits',
  'xmlns:xlink': 'xmlnsXlink',
  'xlink:href': 'xlinkHref',
  'preserveaspectratio': 'preserveAspectRatio',
  viewbox: 'viewBox',
};

/** Attributes that are booleans in JSX. */
const BOOLEAN_ATTR = new Set([
  'required', 'disabled', 'checked', 'readonly', 'autoplay',
  'muted', 'loop', 'controls', 'playsinline', 'novalidate', 'hidden',
]);

/**
 * Attributes React types as `number`, so they must be emitted as JSX
 * expressions (`maxLength={256}`) rather than string literals.
 */
const NUMERIC_ATTR = new Set([
  'maxlength', 'minlength', 'size', 'span', 'start', 'colspan', 'rowspan',
]);

/**
 * Webflow's CMS empty-state placeholder. The CDN serves it with a 403 to
 * non-browser clients so the scraper cannot download it; we ship an equivalent
 * local SVG instead. It only renders inside `.w-dyn-bind-empty` blocks, which
 * are hidden on the live homepage.
 */
const PLACEHOLDER_LOCAL = '/assets/placeholder.svg';

/** Rewrite a remote asset URL to its downloaded local path. */
function localAsset(url) {
  if (!url) return url;
  const trimmed = url.trim();
  if (/\/plugins\/Basic\/assets\/placeholder\./.test(trimmed)) return PLACEHOLDER_LOCAL;
  if (assetMap[trimmed]) return assetMap[trimmed];
  // Try normalising (the map keys are absolute hrefs).
  try {
    const absolute = new URL(trimmed, SITE).href;
    if (assetMap[absolute]) return assetMap[absolute];
  } catch {
    /* ignore */
  }
  return trimmed;
}

/** Rewrite srcset entries to local assets. */
function localSrcSet(value) {
  return value
    .split(',')
    .map((part) => {
      const bits = part.trim().split(/\s+/);
      if (!bits[0]) return null;
      bits[0] = localAsset(bits[0]);
      return bits.join(' ');
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Every link on the replica must point at the corresponding page on the real
 * coframe.com, so root-relative hrefs are absolutised.
 */
function absoluteHref(href) {
  const v = href.trim();
  if (!v || v === '#' || v.startsWith('http') || v.startsWith('mailto:') || v.startsWith('tel:')) {
    return v;
  }
  if (v.startsWith('#')) return v; // in-page anchor
  return `${SITE}${v.startsWith('/') ? '' : '/'}${v}`;
}

/** Convert an inline style string into a JSX style object literal. */
function styleObject(value) {
  const entries = value
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((decl) => {
      const idx = decl.indexOf(':');
      if (idx === -1) return null;
      const prop = decl.slice(0, idx).trim();
      const val = decl.slice(idx + 1).trim();
      // Custom properties keep their literal name and need quoting.
      const key = prop.startsWith('--')
        ? `'${prop}'`
        : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return `${key}: '${val.replace(/'/g, "\\'")}'`;
    })
    .filter(Boolean);
  return entries.length ? `{{ ${entries.join(', ')} }}` : null;
}

/** Escape a text node for JSX. */
function escapeText(text) {
  return text
    .replace(/([{}])/g, '{"$1"}')
    .replace(/\u00a0/g, '{"\\u00a0"}');
}

function renderAttrs($, el) {
  const out = [];
  for (const [rawName, rawValue] of Object.entries(el.attribs || {})) {
    const name = rawName.toLowerCase();
    if (DROP_ATTR(name)) continue;

    let value = rawValue;

    if (name === 'style') {
      const obj = styleObject(value);
      if (obj) out.push(`style=${obj}`);
      continue;
    }
    if (name === 'src' || name === 'poster' || name === 'data-rive-url') {
      value = localAsset(value);
    }
    if (name === 'srcset') {
      value = localSrcSet(value);
    }
    if (name === 'href') {
      value = absoluteHref(value);
    }
    // Webflow ships height="Auto" on some images, which React rejects.
    if ((name === 'height' || name === 'width') && !/^\d+$/.test(value.trim())) {
      continue;
    }
    if (BOOLEAN_ATTR.has(name) && (value === '' || value === name || value === 'true')) {
      out.push(ATTR_RENAME[name] || name);
      continue;
    }

    const jsxName = ATTR_RENAME[name] || name;

    if (NUMERIC_ATTR.has(name) && /^\d+$/.test(value.trim())) {
      out.push(`${jsxName}={${value.trim()}}`);
      continue;
    }

    out.push(`${jsxName}="${value.replace(/"/g, '&quot;')}"`);
  }
  return out;
}

function serialize($, node, depth) {
  const pad = '  '.repeat(depth);

  if (node.type === 'text') {
    const text = node.data || '';
    if (!text.trim()) return '';
    return `${pad}{' '}\n${pad}${escapeText(text.trim())}\n`.replace(`${pad}{' '}\n`, '');
  }
  if (node.type === 'comment') return '';
  if (node.type !== 'tag' && node.type !== 'script' && node.type !== 'style') return '';

  const tag = node.tagName;
  if (tag === 'script' || tag === 'style' || tag === 'noscript') return '';

  const attrs = renderAttrs($, node);
  const attrStr = attrs.length ? ` ${attrs.join(' ')}` : '';

  if (VOID.has(tag)) return `${pad}<${tag}${attrStr} />\n`;

  const children = (node.children || []).map((c) => serialize($, c, depth + 1)).join('');

  if (!children.trim()) return `${pad}<${tag}${attrStr} />\n`;

  return `${pad}<${tag}${attrStr}>\n${children}${pad}</${tag}>\n`;
}

await mkdir(OUT_DIR, { recursive: true });
const written = [];

for (const [file, componentName] of SECTIONS) {
  const html = await readFile(path.join(SECTION_DIR, `${file}.html`), 'utf8');
  const $ = cheerio.load(html, null, false);
  const root = $.root().children().first();

  const jsx = serialize($, root.get(0), 2).trimEnd();

  const source = `// AUTO-GENERATED by scripts/convert.mjs from scrape/sections/${file}.html
// Faithful translation of the www.coframe.com homepage markup. Do not edit by
// hand — re-run \`npm run convert\` instead. Interactive behaviour for this
// markup lives in app/effects/.
/* eslint-disable @next/next/no-img-element */

export default function ${componentName}() {
  return (
${jsx}
  );
}
`;

  const outPath = path.join(OUT_DIR, `${componentName}.tsx`);
  await writeFile(outPath, source, 'utf8');
  written.push({ componentName, bytes: source.length });
  console.log(`[convert] ${file}.html -> ${componentName}.tsx (${source.length} bytes)`);
}

// Barrel file for convenient imports.
await writeFile(
  path.join(OUT_DIR, 'index.ts'),
  '// AUTO-GENERATED by scripts/convert.mjs\n' +
    written.map((w) => `export { default as ${w.componentName} } from './${w.componentName}';`).join('\n') +
    '\n',
  'utf8',
);
console.log(`[convert] ${written.length} components -> app/sections/generated/`);
