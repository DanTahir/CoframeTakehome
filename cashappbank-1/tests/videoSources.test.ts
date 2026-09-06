/**
 * Guards `app/lib/cashVideoSources.ts` against drift.
 *
 * That table is the only hand-written bridge between the capture artifacts and
 * the runtime: the original page ships its six `<video>` elements with no `src`
 * and no `<source>`, so if a single hashed filename in the table is wrong the
 * page silently renders a blank box — no console error, nothing to notice in a
 * quick glance. So rather than trust the transcription, this test re-derives the
 * whole table from the capture artifacts and compares.
 *
 * Derivation chain (same as the runtime's own source of truth):
 *   __NEXT_DATA__ sections[] -> media.sources[] (remote URL + mediaQuery)
 *     -> scrape/asset-map.json  (remote -> local, protocol-relative aware)
 *       -> public/<local>       (file must exist on disk)
 *
 * `scrape/` is a gitignored build artifact, so the derivation tests skip when it
 * is absent (e.g. a fresh clone before `npm run pipeline`). The disk-existence
 * and shape checks still run unconditionally.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CASH_VIDEO_SOURCES } from '../app/lib/cashVideoSources';

const ROOT = path.resolve(__dirname, '..');
const STATIC_HTML = path.join(ROOT, 'scrape', 'raw', 'index.static.html');
const ASSET_MAP = path.join(ROOT, 'scrape', 'asset-map.json');
const hasCapture = fs.existsSync(STATIC_HTML) && fs.existsSync(ASSET_MAP);

/** Resolves a possibly protocol-relative URL against the asset map. */
function lookupLocal(map: Record<string, string>, url: string): string | undefined {
  const candidates = [url];
  if (url.startsWith('//')) candidates.push(`https:${url}`, `http:${url}`);
  else if (url.startsWith('https://')) candidates.push(url.replace(/^https:/, ''));
  for (const candidate of candidates) {
    if (map[candidate]) return map[candidate];
  }
  return undefined;
}

interface DerivedSource {
  mediaQuery: string;
  src: string;
  type: string;
}

/** Re-derives the expected table from the capture artifacts. */
function deriveExpected(): DerivedSource[][] {
  const html = fs.readFileSync(STATIC_HTML, 'utf8');
  const json = html.match(
    /<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!json) throw new Error('__NEXT_DATA__ not found in the captured HTML');
  const data = JSON.parse(json[1]);
  const sections = data?.props?.pageProps?.sections ?? [];

  const rawMap = JSON.parse(fs.readFileSync(ASSET_MAP, 'utf8'));
  const map: Record<string, string> = rawMap.map ?? rawMap.assets ?? rawMap;

  // Depth-first walk collecting every `sources[]` array that holds video files,
  // in document order — the same order the <video> elements appear in the DOM.
  const found: DerivedSource[][] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const obj = node as Record<string, unknown>;
    const sources = obj.sources;
    if (
      Array.isArray(sources) &&
      sources.some(
        (s) =>
          s &&
          typeof (s as { src?: unknown }).src === 'string' &&
          /\.(mp4|webm|mov)(\?|$)/i.test((s as { src: string }).src),
      )
    ) {
      found.push(
        (sources as Array<{ src: string; mediaQuery: string; type: string }>).map((s) => {
          const local = lookupLocal(map, s.src);
          if (!local) throw new Error(`no asset-map entry for ${s.src}`);
          return { mediaQuery: s.mediaQuery, src: local, type: s.type };
        }),
      );
    }
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'sources') continue;
      visit(value);
    }
  };
  sections.forEach(visit);
  return found;
}

describe('cashVideoSources table shape', () => {
  it('covers six videos, each with at least one source', () => {
    expect(CASH_VIDEO_SOURCES).toHaveLength(6);
    for (const entry of CASH_VIDEO_SOURCES) {
      expect(entry.length).toBeGreaterThan(0);
    }
  });

  it('uses only local, self-hosted paths', () => {
    for (const entry of CASH_VIDEO_SOURCES) {
      for (const source of entry) {
        expect(source.src.startsWith('/assets/')).toBe(true);
        expect(source.src).not.toMatch(/^https?:|^\/\//);
        expect(source.type).toBe('video/mp4');
        expect(source.mediaQuery).toMatch(/min-width:\s*\d+px/);
      }
    }
  });

  it('points at files that exist in public/', () => {
    for (const entry of CASH_VIDEO_SOURCES) {
      for (const source of entry) {
        const onDisk = path.join(ROOT, 'public', source.src.replace(/^\//, ''));
        expect(fs.existsSync(onDisk), `missing asset: ${source.src}`).toBe(true);
      }
    }
  });

  it('orders sources so the widest matching breakpoint wins', () => {
    // The runtime picks the LAST matching media query, so entries must be
    // ordered narrowest-first for the desktop variant to win on desktop.
    for (const entry of CASH_VIDEO_SOURCES) {
      const widths = entry.map((s) => Number(s.mediaQuery.match(/(\d+)px/)?.[1] ?? 0));
      const sorted = [...widths].sort((a, b) => a - b);
      expect(widths).toEqual(sorted);
    }
  });
});

describe.skipIf(!hasCapture)('cashVideoSources matches the capture artifacts', () => {
  it('re-derives byte-identically from __NEXT_DATA__ + asset-map', () => {
    const expected = deriveExpected();
    // Compare as plain JSON so a readonly/mutable mismatch is not the failure.
    expect(JSON.parse(JSON.stringify(CASH_VIDEO_SOURCES))).toEqual(expected);
  });

  it('accounts for every video asset that was downloaded', () => {
    const referenced = new Set(
      CASH_VIDEO_SOURCES.flat().map((s) => path.basename(s.src)),
    );
    const videoDir = path.join(ROOT, 'public', 'assets', 'video');
    const onDisk = fs.existsSync(videoDir)
      ? fs.readdirSync(videoDir).filter((f) => f.endsWith('.mp4'))
      : [];
    // Every downloaded video should be wired up; an orphan means a missed
    // element (or a stale asset left behind by an earlier scrape).
    expect([...onDisk].sort()).toEqual([...referenced].sort());
  });
});
