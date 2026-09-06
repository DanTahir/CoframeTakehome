/**
 * Guards `app/lib/cashResponsiveImages.ts` against drift.
 *
 * That table maps each captured desktop image to the mobile asset the live site
 * swaps in below `max-width:759px`. Both halves can rot silently:
 *
 *  - the DESKTOP path must match what codegen actually baked into the JSX. Asset
 *    filenames carry a content hash, so a re-scrape that changes a hash leaves
 *    the table pointing at a path no element on the page has -- the effect then
 *    matches nothing and silently does nothing at phone widths.
 *  - the MOBILE path must exist on disk. These files are only downloaded because
 *    `extraAssets` in replica.config.json lists them (the desktop-viewport
 *    capture never requested them), so dropping an entry there yields a 404 that
 *    only reproduces below 759px -- exactly where nobody looks.
 *
 * Neither failure produces a console error, so instead of trusting the table
 * this test re-derives both halves from the build artifacts and compares.
 *
 * `scrape/` and `app/generated/` are build artifacts, so the derivation tests
 * skip when absent (e.g. a fresh clone before `npm run pipeline`). Shape and
 * on-disk checks always run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CASH_MOBILE_MEDIA_QUERY,
  CASH_RESPONSIVE_IMAGES,
} from '../app/lib/cashResponsiveImages';

const ROOT = path.resolve(__dirname, '..');
const GENERATED_DIR = path.join(ROOT, 'app', 'generated');
const ASSET_MAP = path.join(ROOT, 'scrape', 'asset-map.json');
const CONFIG = path.join(ROOT, 'replica.config.json');

const hasGenerated = fs.existsSync(GENERATED_DIR);
const hasCapture = fs.existsSync(ASSET_MAP);

/** Concatenated source of every generated section component. */
function generatedSource(): string {
  return fs
    .readdirSync(GENERATED_DIR)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => fs.readFileSync(path.join(GENERATED_DIR, f), 'utf8'))
    .join('\n');
}

/**
 * Extracts the `src` of every `<img>` in the generated JSX whose className
 * contains `responsiveImage` -- the same set the runtime effect targets.
 */
function generatedResponsiveImageSrcs(): string[] {
  const src = generatedSource();
  const out: string[] = [];
  // Generated JSX puts each element on one line; match img tags containing the
  // marker class and pull the src out of the same tag.
  for (const tag of src.match(/<img\b[^>]*>/g) ?? []) {
    if (!tag.includes('responsiveImage')) continue;
    const m = tag.match(/src="([^"]+)"/);
    if (m) out.push(m[1]);
  }
  return out;
}

describe('cashResponsiveImages table shape', () => {
  it('covers the eight responsive images', () => {
    expect(CASH_RESPONSIVE_IMAGES).toHaveLength(8);
  });

  it('uses the breakpoint from the site\'s own bundle (bpTabletPortrait - 1)', () => {
    expect(CASH_MOBILE_MEDIA_QUERY).toBe('(max-width: 759px)');
  });

  it('uses only local, self-hosted image paths', () => {
    for (const pair of CASH_RESPONSIVE_IMAGES) {
      for (const src of [pair.desktop, pair.mobile]) {
        expect(src.startsWith('/assets/img/')).toBe(true);
        expect(src).not.toMatch(/^https?:|^\/\//);
      }
    }
  });

  it('pairs two genuinely different assets', () => {
    for (const pair of CASH_RESPONSIVE_IMAGES) {
      expect(pair.mobile).not.toBe(pair.desktop);
    }
  });

  it('never reuses an asset across entries', () => {
    const all = CASH_RESPONSIVE_IMAGES.flatMap((p) => [p.desktop, p.mobile]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('points at files that exist in public/', () => {
    for (const pair of CASH_RESPONSIVE_IMAGES) {
      for (const src of [pair.desktop, pair.mobile]) {
        const onDisk = path.join(ROOT, 'public', src.replace(/^\//, ''));
        expect(fs.existsSync(onDisk), `missing asset: ${src}`).toBe(true);
      }
    }
  });
});

describe.skipIf(!hasGenerated)('cashResponsiveImages matches the generated markup', () => {
  it('every desktop path is actually present in the generated JSX', () => {
    const inMarkup = new Set(generatedResponsiveImageSrcs());
    for (const pair of CASH_RESPONSIVE_IMAGES) {
      expect(
        inMarkup.has(pair.desktop),
        `table desktop path not found in generated JSX (hash drift?): ${pair.desktop}`,
      ).toBe(true);
    }
  });

  it('covers every responsiveImage element codegen emitted', () => {
    const inMarkup = generatedResponsiveImageSrcs();
    const covered = new Set(CASH_RESPONSIVE_IMAGES.map((p) => p.desktop));
    // An uncovered element would keep its desktop asset at phone widths.
    const uncovered = inMarkup.filter((s) => !covered.has(s));
    expect(uncovered, `responsiveImage elements missing from the table: ${uncovered.join(', ')}`).toEqual([]);
  });
});

describe.skipIf(!hasCapture)('cashResponsiveImages mobile assets are wired for download', () => {
  it('every mobile asset resolves through the asset map', () => {
    const rawMap = JSON.parse(fs.readFileSync(ASSET_MAP, 'utf8'));
    const map: Record<string, string> = rawMap.map ?? rawMap.assets ?? rawMap;
    const localised = new Set(Object.values(map));
    for (const pair of CASH_RESPONSIVE_IMAGES) {
      expect(
        localised.has(pair.mobile),
        `mobile asset is not in scrape/asset-map.json: ${pair.mobile}`,
      ).toBe(true);
    }
  });

  it('every mobile asset is requested via extraAssets in replica.config.json', () => {
    const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
    const extra: string[] = cfg.extraAssets ?? [];
    const extraBasenames = new Set(
      extra.map((url) => url.split('?')[0].split('/').pop() as string),
    );
    for (const pair of CASH_RESPONSIVE_IMAGES) {
      // Local paths are `<name>.<hash>.<ext>`; recover `<name>.<ext>`.
      const local = path.basename(pair.mobile);
      const original = local.replace(/\.[0-9a-f]{8}(\.[^.]+)$/, '$1');
      expect(
        extraBasenames.has(original),
        `mobile asset not listed in extraAssets, so a re-scrape would drop it: ${original}`,
      ).toBe(true);
    }
  });
});
