// Asset integrity: every asset the replica references must exist on disk, and
// nothing may still point at the original CDN.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { PROJECT_ROOT, readProjectFile } from './helpers';

const GENERATED_DIR = path.join(PROJECT_ROOT, 'app', 'sections', 'generated');
const STYLES_DIR = path.join(PROJECT_ROOT, 'app', 'styles');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

function generatedSources(): string[] {
  return readdirSync(GENERATED_DIR)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => readFileSync(path.join(GENERATED_DIR, f), 'utf8'));
}

function styleSources(): Array<{ name: string; css: string }> {
  return readdirSync(STYLES_DIR)
    .filter((f) => f.endsWith('.css'))
    .map((f) => ({ name: f, css: readFileSync(path.join(STYLES_DIR, f), 'utf8') }));
}

/** Every `/assets/...` path referenced from markup (src, srcset, data-rive-url). */
function markupAssetRefs(): Set<string> {
  const refs = new Set<string>();
  for (const src of generatedSources()) {
    for (const m of src.matchAll(/"(\/assets\/[^"]+)"/g)) {
      const value = m[1];
      // srcset values hold several "path 500w" pairs.
      if (/\s\d+w/.test(value)) {
        for (const part of value.split(',')) {
          const p = part.trim().split(/\s+/)[0];
          if (p.startsWith('/assets/')) refs.add(p);
        }
      } else {
        refs.add(value);
      }
    }
  }
  return refs;
}

/** Every `/assets/...` path referenced from a url() in the self-hosted CSS. */
function cssAssetRefs(): Set<string> {
  const refs = new Set<string>();
  for (const { css } of styleSources()) {
    for (const m of css.matchAll(/url\(\s*['"]?(\/assets\/[^'")]+)['"]?\s*\)/g)) {
      refs.add(m[1].split('?')[0]);
    }
  }
  return refs;
}

describe('self-hosted assets', () => {
  it('references a realistic number of assets from markup', () => {
    expect(markupAssetRefs().size).toBeGreaterThan(40);
  });

  it('has every markup-referenced asset present on disk', () => {
    const missing = [...markupAssetRefs()].filter(
      (ref) => !existsSync(path.join(PUBLIC_DIR, ref)),
    );
    expect(missing).toEqual([]);
  });

  it('has every CSS-referenced asset present on disk', () => {
    const missing = [...cssAssetRefs()].filter(
      (ref) => !existsSync(path.join(PUBLIC_DIR, ref)),
    );
    expect(missing).toEqual([]);
  });

  it('no longer references the original Webflow CDN from CSS', () => {
    const offenders = styleSources()
      .filter(({ css }) => css.includes('cdn.prod.website-files.com'))
      .map(({ name }) => name);
    expect(offenders).toEqual([]);
  });

  it('no longer references remote font hosts from CSS', () => {
    // Only actual references count. fonts.css opens with a provenance comment
    // naming the Google Fonts URL the self-hosted faces were derived from, which
    // is documentation, not a request the browser would make.
    const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
    const offenders = styleSources()
      .filter(({ css }) =>
        /(?:url\(|@import\s+)['"]?[^'")]*(?:fonts\.gstatic\.com|fonts\.googleapis\.com)/.test(
          stripComments(css),
        ),
      )
      .map(({ name }) => name);
    expect(offenders).toEqual([]);
  });

  it('self-hosts the full font set', () => {
    const fonts = readdirSync(path.join(PUBLIC_DIR, 'assets', 'fonts'));
    expect(fonts.length).toBeGreaterThanOrEqual(20);
    expect(fonts.every((f) => /\.(woff2?|ttf|otf|eot)$/i.test(f))).toBe(true);
  });

  it('ships a valid Rive animation file', () => {
    const riveDir = path.join(PUBLIC_DIR, 'assets', 'rive');
    const riv = readdirSync(riveDir).find((f) => f.endsWith('.riv'));
    expect(riv).toBeDefined();

    const full = path.join(riveDir, riv as string);
    // .riv files start with the ASCII magic "RIVE".
    const header = readFileSync(full).subarray(0, 4).toString('latin1');
    expect(header).toBe('RIVE');
    expect(statSync(full).size).toBeGreaterThan(1_000_000);
  });

  it('ships a valid self-hosted Rive WASM runtime', () => {
    // Must be the webgl2 build, matching riveChart.ts's RIVE_WASM_URL. The
    // canvas renderer's rive.wasm is not interchangeable, and asserting on that
    // filename would keep passing against an orphaned file the app never loads.
    const wasm = path.join(PUBLIC_DIR, 'assets', 'rive', 'rive-webgl2.wasm');
    expect(existsSync(wasm)).toBe(true);
    // WASM magic bytes: 0x00 'a' 's' 'm'
    const header = readFileSync(wasm).subarray(0, 4);
    expect([...header]).toEqual([0x00, 0x61, 0x73, 0x6d]);
  });

  it('ships no unused Rive runtime blobs', () => {
    // The port briefly used @rive-app/canvas before the renderer was corrected;
    // its wasm files and the UMD build used by the throwaway debug harness must
    // not linger in public/, or the replica ships megabytes it never requests.
    const riveDir = path.join(PUBLIC_DIR, 'assets', 'rive');
    const stale = readdirSync(riveDir).filter((f) =>
      ['rive.wasm', 'rive_fallback.wasm', 'rive-umd.js'].includes(f),
    );
    expect(stale).toEqual([]);
  });

  it('points the Rive loader at the self-hosted WASM, not a CDN', () => {
    const src = readProjectFile(path.join('app', 'lib', 'riveChart.ts'));
    // Must be the webgl2 build's wasm: the live site loads @rive-app/webgl2 and
    // this .riv does not render on the plain canvas renderer.
    expect(src).toContain("'/assets/rive/rive-webgl2.wasm'");

    // Check code, not comments. riveChart.ts documents *which* CDN URL the live
    // site was observed fetching (unpkg.com/@rive-app/webgl2@2.35.0/rive.wasm) as
    // the evidence for the renderer choice; that provenance note is not a request
    // the replica makes.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/unpkg\.com|jsdelivr\.net|cdn\.rive\.app/);
  });

  it('serves the hero chart .riv from the local assets directory', () => {
    const riveUrl = generatedSources()
      .flatMap((src) => [...src.matchAll(/data-rive-url="([^"]+)"/g)].map((m) => m[1]))
      .at(0);
    expect(riveUrl).toBeDefined();
    expect(riveUrl).toMatch(/^\/assets\/rive\/.*\.riv$/);
    expect(existsSync(path.join(PUBLIC_DIR, riveUrl as string))).toBe(true);
  });
});
