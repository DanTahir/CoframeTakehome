// Shared test helpers.
//
// The replica's markup is generated from the scraped homepage, so most tests work
// by rendering the section components to static HTML and either comparing that
// against the raw scraped source (fidelity tests) or mounting it into jsdom and
// exercising the ported behaviours against it (behaviour tests).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  ContentSections,
  CursorContainer,
  EmbeddedStylesAndScripts,
  FloatingCta,
  FooterSection,
  HeroSection,
  NavSection,
  OrphanCompareCell,
} from '../app/sections/generated';

export const PROJECT_ROOT = path.resolve(__dirname, '..');
export const RAW_HTML_PATH = path.join(PROJECT_ROOT, 'scrape', 'raw', 'index.html');

/** The section components in the same order as the live document's <body>. */
export const BODY_SECTIONS = [
  CursorContainer,
  NavSection,
  HeroSection,
  ContentSections,
  FooterSection,
  EmbeddedStylesAndScripts,
  FloatingCta,
  OrphanCompareCell,
];

let cachedMarkup: string | null = null;

/** Renders the whole replica body (minus the client runtime) to static HTML. */
export function renderBodyMarkup(): string {
  if (cachedMarkup === null) {
    cachedMarkup = BODY_SECTIONS.map((Component) =>
      renderToStaticMarkup(createElement(Component)),
    ).join('');
  }
  return cachedMarkup;
}

/** Mounts the rendered replica markup into document.body and returns it. */
export function mountBody(): HTMLElement {
  document.body.innerHTML = renderBodyMarkup();
  document.body.className = 'body';
  return document.body;
}

export function unmountBody(): void {
  document.body.innerHTML = '';
}

let cachedRawBody: string | null = null;

/**
 * The raw scraped <body> inner HTML with <script> and <style> blocks removed,
 * matching what the JSX generator emits (it strips both).
 */
export function rawBodyHtml(): string {
  if (cachedRawBody === null) {
    const html = readFileSync(RAW_HTML_PATH, 'utf8');
    const bodyStart = html.indexOf('<body');
    const bodyOpenEnd = html.indexOf('>', bodyStart) + 1;
    const bodyEnd = html.lastIndexOf('</body>');
    cachedRawBody = html
      .slice(bodyOpenEnd, bodyEnd)
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
  }
  return cachedRawBody;
}

/**
 * Strips the `<link rel="preload" as="image">` tags React 19 synthesizes.
 *
 * React 19 emits a preload resource hint for every eagerly-loaded <img>. In the
 * real app those are hoisted into <head> (a perf feature, and one the live
 * Webflow page also uses for two of its hero images), but renderToStaticMarkup
 * has no <head> to hoist into so they land inline in the body markup. They are
 * resource hints, not content, so they're excluded from structural diffs.
 */
export function stripSynthesizedPreloads(html: string): string {
  return html.replace(/<link\b[^>]*\brel="preload"[^>]*>/gi, '');
}

/** Counts occurrences of each class token across every class attribute. */
export function classTokenCounts(html: string): Map<string, number> {
  const counts = new Map<string, number>();
  const attrRe = /\sclass(?:Name)?="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(html)) !== null) {
    for (const token of match[1].split(/\s+/)) {
      if (!token) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return counts;
}

/** Counts opening tags by name. */
export function tagCounts(html: string): Map<string, number> {
  const counts = new Map<string, number>();
  const tagRe = /<([a-zA-Z][a-zA-Z0-9-]*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return counts;
}

/** Number of elements matching a selector in the mounted document. */
export function countIn(root: ParentNode, selector: string): number {
  return root.querySelectorAll(selector).length;
}

/** Reads a generated/authored project file as text. */
export function readProjectFile(relPath: string): string {
  return readFileSync(path.join(PROJECT_ROOT, relPath), 'utf8');
}
