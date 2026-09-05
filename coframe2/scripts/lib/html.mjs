// HTML -> JSX conversion utilities, shared by the section generator and its tests.
//
// The scraped Webflow markup is converted verbatim except for four deliberate
// transforms:
//   1. remote asset URLs  -> self-hosted /assets/... paths
//   2. site-relative hrefs -> absolute https://www.coframe.com/... links
//   3. inline <style> blocks -> stripped (collected into app/styles/embedded.css)
//   4. inline <script> blocks -> stripped (ported to typed modules in app/lib/)
// The wrapper elements around (3) and (4) are kept so the DOM shape still matches.

import { rewriteAssetUrl, rewriteSrcset, rewriteHref } from './rewrite.mjs';

export const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

/** Extracts <body> attrs + inner HTML. */
export function getBody(html) {
  const m = /<body([^>]*)>([\s\S]*)<\/body>/i.exec(html);
  if (!m) throw new Error('no <body> found');
  return { attrs: m[1].trim(), html: m[2] };
}

/**
 * Returns the direct element children of an HTML fragment, each with its full
 * outer HTML. Text between elements is ignored (the Webflow output has none of
 * significance at these levels).
 */
export function topLevelChildren(fragment) {
  const out = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let depth = 0;
  let start = null;
  let startTag = null;
  let m;
  while ((m = re.exec(fragment))) {
    const [full, close, tag, attrs, selfClose] = m;
    const lower = tag.toLowerCase();
    // Skip over raw-text elements wholesale so their contents can't affect depth.
    if (lower === 'script' || lower === 'style') {
      if (!close && !selfClose) {
        const end = fragment.toLowerCase().indexOf(`</${lower}>`, re.lastIndex);
        if (end !== -1) re.lastIndex = end + lower.length + 3;
      }
      continue;
    }
    if (VOID_ELEMENTS.has(lower) || selfClose) {
      if (depth === 0) out.push({ tag, attrs: attrs.trim(), html: full, inner: '' });
      continue;
    }
    if (!close) {
      if (depth === 0) {
        start = m.index;
        startTag = { tag, attrs: attrs.trim() };
      }
      depth++;
    } else {
      depth--;
      if (depth === 0 && start !== null) {
        const html = fragment.slice(start, re.lastIndex);
        const inner = html.replace(/^<[^>]*>/, '').replace(/<\/[a-zA-Z][\w-]*>$/, '');
        out.push({ ...startTag, html, inner });
        start = null;
      }
    }
  }
  return out;
}

/** Reads a named attribute out of a raw attribute string. */
export function getAttr(attrs, name) {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`, 'i').exec(attrs);
  return m ? m[1] : '';
}

/** Splits a raw attribute string into [name, value|null] pairs, in order. */
export function parseAttrs(attrsStr) {
  const out = [];
  const re = /([a-zA-Z_:][-\w:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(attrsStr))) {
    const name = m[1];
    const value = m[2] ?? m[3] ?? m[4] ?? null;
    out.push([name, value]);
  }
  return out;
}

// HTML attribute name -> JSX prop name. Anything not listed and not data-/aria-
// is passed through unchanged (React forwards unknown attributes as-is).
const ATTR_MAP = {
  class: 'className',
  for: 'htmlFor',
  maxlength: 'maxLength',
  minlength: 'minLength',
  readonly: 'readOnly',
  tabindex: 'tabIndex',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  autoplay: 'autoPlay',
  novalidate: 'noValidate',
  enctype: 'encType',
  accesskey: 'accessKey',
  contenteditable: 'contentEditable',
  crossorigin: 'crossOrigin',
  datetime: 'dateTime',
  formaction: 'formAction',
  formnovalidate: 'formNoValidate',
  frameborder: 'frameBorder',
  hreflang: 'hrefLang',
  inputmode: 'inputMode',
  ismap: 'isMap',
  itemprop: 'itemProp',
  itemscope: 'itemScope',
  itemtype: 'itemType',
  marginheight: 'marginHeight',
  marginwidth: 'marginWidth',
  playsinline: 'playsInline',
  spellcheck: 'spellCheck',
  srcdoc: 'srcDoc',
  srclang: 'srcLang',
  srcset: 'srcSet',
  usemap: 'useMap',
  // SVG presentation attributes React expects in camelCase form.
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-opacity': 'strokeOpacity',
  'fill-opacity': 'fillOpacity',
  'fill-rule': 'fillRule',
  'clip-path': 'clipPath',
  'clip-rule': 'clipRule',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'text-anchor': 'textAnchor',
  'letter-spacing': 'letterSpacing',
  'gradientunits': 'gradientUnits',
  'gradienttransform': 'gradientTransform',
  'patternunits': 'patternUnits',
  'maskunits': 'maskUnits',
  'clippathunits': 'clipPathUnits',
  'preserveaspectratio': 'preserveAspectRatio',
  'xmlns:xlink': 'xmlnsXlink',
  'xlink:href': 'xlinkHref',
  'stroke-linecap:': 'strokeLinecap',
};

// Attributes React treats as controlled-input props; the scraped markup means
// them as initial values.
const VALUE_TO_DEFAULT = { input: { value: 'defaultValue', checked: 'defaultChecked' } };

// Boolean props React wants as booleans rather than empty strings.
const BOOLEAN_PROPS = new Set([
  'disabled', 'checked', 'readOnly', 'required', 'autoFocus', 'autoPlay',
  'controls', 'loop', 'muted', 'multiple', 'noValidate', 'open', 'selected',
  'playsInline', 'itemScope', 'defaultChecked',
]);

// Props React types as `number` only (unlike width/height, which accept both).
// Emitted as {256} rather than "256" so the generated TSX typechecks.
const NUMERIC_PROPS = new Set([
  'maxLength', 'minLength', 'tabIndex', 'colSpan', 'rowSpan', 'size', 'span',
  'start', 'rows', 'cols', 'marginWidth', 'marginHeight',
]);

/** kebab/vendor CSS property -> JS style key. */
export function cssPropToJs(prop) {
  const p = prop.trim();
  if (p.startsWith('--')) return null; // custom property: must stay quoted verbatim
  if (p.startsWith('-webkit-')) return 'Webkit' + upperCamel(p.slice(8));
  if (p.startsWith('-moz-')) return 'Moz' + upperCamel(p.slice(5));
  if (p.startsWith('-ms-')) return 'ms' + upperCamel(p.slice(4));
  if (p.startsWith('-o-')) return 'O' + upperCamel(p.slice(3));
  return p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function upperCamel(s) {
  const camel = s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/** Converts an inline style attribute into a JSX style object literal. */
export function styleToJsx(styleStr) {
  const entries = [];
  // Split on ';' that aren't inside parentheses (e.g. url(), rgba(), calc()).
  let depth = 0;
  let buf = '';
  const parts = [];
  for (const ch of styleStr) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ';' && depth === 0) {
      parts.push(buf);
      buf = '';
    } else buf += ch;
  }
  if (buf.trim()) parts.push(buf);

  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const rawProp = part.slice(0, idx).trim();
    const rawValue = part.slice(idx + 1).trim();
    if (!rawProp || !rawValue) continue;
    const jsProp = cssPropToJs(rawProp);
    const key = jsProp === null ? JSON.stringify(rawProp) : jsProp;
    entries.push(`${key}: ${JSON.stringify(rawValue)}`);
  }
  return `{{ ${entries.join(', ')} }}`;
}

/** Escapes a text node for JSX. */
export function escapeText(text) {
  return text.replace(/[{}]/g, (c) => `{'${c}'}`);
}

/**
 * Converts an HTML fragment to JSX source.
 * @param {string} html
 * @param {{ assetMap: Record<string,string> }} opts
 */
export function htmlToJsx(html, opts) {
  const map = opts.assetMap ?? {};
  let out = '';
  let i = 0;
  const openStack = [];

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      out += escapeText(html.slice(i));
      break;
    }
    if (lt > i) out += escapeText(html.slice(i, lt));

    // Comment
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    // Doctype / processing instruction
    if (html.startsWith('<!', lt)) {
      const end = html.indexOf('>', lt);
      i = end === -1 ? html.length : end + 1;
      continue;
    }

    const tagMatch = /^<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/.exec(html.slice(lt));
    if (!tagMatch) {
      // A stray '<' in text.
      out += escapeText('<');
      i = lt + 1;
      continue;
    }
    const [full, close, tag, attrsStr, selfClose] = tagMatch;
    const lower = tag.toLowerCase();

    // Strip <style>/<script> wholesale: their content lives in generated CSS/TS.
    if (lower === 'style' || lower === 'script') {
      if (close) {
        i = lt + full.length;
        continue;
      }
      if (selfClose) {
        i = lt + full.length;
        continue;
      }
      const closeIdx = html.toLowerCase().indexOf(`</${lower}>`, lt + full.length);
      i = closeIdx === -1 ? html.length : closeIdx + lower.length + 3;
      continue;
    }

    if (close) {
      const expected = openStack.pop();
      // Void elements never opened a scope; ignore a stray close for them.
      if (expected === lower) out += `</${tag}>`;
      else if (expected !== undefined) {
        // Mismatched close in source: close what we actually opened to keep JSX valid.
        out += `</${expected}>`;
      }
      i = lt + full.length;
      continue;
    }

    const props = renderProps(lower, attrsStr, map);
    const isVoid = VOID_ELEMENTS.has(lower) || selfClose;
    if (isVoid) {
      out += `<${tag}${props} />`;
    } else {
      out += `<${tag}${props}>`;
      openStack.push(lower);
    }
    i = lt + full.length;
  }

  // Close anything the source left open (Webflow output is well-formed, but be safe).
  while (openStack.length) out += `</${openStack.pop()}>`;

  return out;
}

function renderProps(tagLower, attrsStr, map) {
  const attrs = parseAttrs(attrsStr);
  const seen = new Set();
  let out = '';

  for (const [rawName, rawValue] of attrs) {
    const lowerName = rawName.toLowerCase();

    // Rewrite URL-bearing attributes.
    let value = rawValue;
    if (value !== null) {
      if (lowerName === 'src' || lowerName === 'poster' || lowerName === 'data-rive-url') {
        value = rewriteAssetUrl(value, map);
      } else if (lowerName === 'srcset') {
        value = rewriteSrcset(value, map);
      } else if (lowerName === 'href') {
        // Stylesheet/icon hrefs are assets; anchor hrefs are navigation.
        value = tagLower === 'a' ? rewriteHref(value) : rewriteAssetUrl(value, map);
      }
    }

    // Map the attribute name.
    let name = ATTR_MAP[lowerName] ?? rawName;
    if (lowerName.startsWith('data-') || lowerName.startsWith('aria-')) name = lowerName;
    const remap = VALUE_TO_DEFAULT[tagLower]?.[lowerName];
    if (remap) name = remap;

    if (seen.has(name)) continue; // duplicate attribute in source: first wins
    seen.add(name);

    if (lowerName === 'style') {
      out += ` style=${styleToJsx(value ?? '')}`;
      continue;
    }

    if (value === null) {
      out += BOOLEAN_PROPS.has(name) ? ` ${name}={true}` : ` ${name}=""`;
      continue;
    }

    if (BOOLEAN_PROPS.has(name)) {
      const falsy = value === 'false';
      out += ` ${name}={${falsy ? 'false' : 'true'}}`;
      continue;
    }

    if (NUMERIC_PROPS.has(name) && /^-?\d+$/.test(value.trim())) {
      out += ` ${name}={${value.trim()}}`;
      continue;
    }

    // JSX string literals can't contain a raw double quote or newline.
    if (value.includes('"') || value.includes('\n')) out += ` ${name}={${JSON.stringify(value)}}`;
    else out += ` ${name}="${value}"`;
  }

  return out;
}
