import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Static integrity checks over the generated markup and the self-hosted
 * stylesheets. These are the tests that catch a broken replica: a missing
 * download, a stale asset path, or a link that still points at a CDN.
 */
const ROOT = path.resolve(__dirname, '..');
const GENERATED_DIR = path.join(ROOT, 'app', 'sections', 'generated');
const STYLES_DIR = path.join(ROOT, 'app', 'styles');
const PUBLIC_DIR = path.join(ROOT, 'public');

function readAllFiles(dir: string, extensions: string[]): Array<{ file: string; content: string }> {
  const out: Array<{ file: string; content: string }> = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...readAllFiles(full, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      out.push({ file: path.relative(ROOT, full), content: fs.readFileSync(full, 'utf8') });
    }
  }
  return out;
}

const componentFiles = readAllFiles(GENERATED_DIR, ['.tsx']);
const styleFiles = readAllFiles(STYLES_DIR, ['.css']);

/** Every `/assets/...` reference found in the generated components. */
function assetRefsIn(content: string): string[] {
  return [...content.matchAll(/\/assets\/[^"'\s)]+/g)].map((m) => m[0]);
}

describe('generated components', () => {
  it('produced a component for all 13 page sections', () => {
    expect(componentFiles.length).toBeGreaterThanOrEqual(13);
  });

  it('exports every section from the barrel', () => {
    const barrel = fs.readFileSync(path.join(GENERATED_DIR, 'index.ts'), 'utf8');
    for (const name of [
      'NavSection',
      'HeroSection',
      'IntroductionSection',
      'CompareSection',
      'OpenAiBannerSection',
      'HowItWorksSection',
      'FeaturesSection',
      'IntegrationsSection',
      'SecuritySection',
      'TestimonialsSection',
      'BlogSection',
      'FooterSection',
      'FloatingCta',
    ]) {
      expect(barrel).toContain(name);
    }
  });
});

describe('asset self-hosting', () => {
  it('references no remote Webflow CDN assets', () => {
    const offenders: string[] = [];
    for (const { file, content } of componentFiles) {
      for (const match of content.matchAll(/https:\/\/[^"']*website-files\.com[^"']*/g)) {
        offenders.push(`${file}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('references no remote assets in the self-hosted stylesheets', () => {
    const offenders: string[] = [];
    for (const { file, content } of styleFiles) {
      for (const match of content.matchAll(/url\((['"]?)(https?:)?\/\/[^)]*\)/g)) {
        offenders.push(`${file}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('has every asset referenced by a component present on disk', () => {
    const missing: string[] = [];
    for (const { file, content } of componentFiles) {
      for (const ref of assetRefsIn(content)) {
        const onDisk = path.join(PUBLIC_DIR, decodeURIComponent(ref));
        if (!fs.existsSync(onDisk)) missing.push(`${file}: ${ref}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('has every font referenced by the stylesheets present on disk', () => {
    const missing: string[] = [];
    for (const { file, content } of styleFiles) {
      for (const match of content.matchAll(/url\(['"]?(\/assets\/[^'")]+)['"]?\)/g)) {
        const onDisk = path.join(PUBLIC_DIR, decodeURIComponent(match[1]));
        if (!fs.existsSync(onDisk)) missing.push(`${file}: ${match[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('downloaded a substantial asset library', () => {
    const assets = fs.readdirSync(path.join(PUBLIC_DIR, 'assets'));
    // 90+ media files were discovered on the live page.
    expect(assets.length).toBeGreaterThan(80);
  });

  it('downloaded the self-hosted font files', () => {
    const fonts = fs.readdirSync(path.join(PUBLIC_DIR, 'assets', 'fonts'));
    expect(fonts.length).toBeGreaterThanOrEqual(20);
    expect(fonts.every((f) => /\.(woff2?|ttf|otf|eot)$/i.test(f))).toBe(true);
  });

  it('self-hosts the Rive WASM binary instead of fetching it from a CDN', () => {
    // @rive-app/canvas defaults to pulling rive.wasm from unpkg.com at
    // runtime, which would break the "everything self-hosted" requirement.
    const wasm = path.join(PUBLIC_DIR, 'assets', 'rive.wasm');
    expect(fs.existsSync(wasm)).toBe(true);
    expect(fs.statSync(wasm).size).toBeGreaterThan(100_000);

    const source = fs.readFileSync(
      path.join(ROOT, 'app', 'effects', 'RiveChart.tsx'),
      'utf8',
    );
    expect(source).toContain('RuntimeLoader.setWasmUrl');
    expect(source).toContain('/assets/rive.wasm');
    // No remote CDN *URL* (a prose mention in a comment is fine).
    expect(source).not.toMatch(/https?:\/\/[^'"\s]*unpkg\.com/);
  });

  it('self-hosts the hero Rive chart', () => {
    const hero = componentFiles.find((f) => f.file.includes('HeroSection'))!;
    const riveUrl = hero.content.match(/data-rive-url="([^"]+)"/)?.[1];
    expect(riveUrl).toBeDefined();
    expect(riveUrl!.startsWith('/assets/')).toBe(true);
    expect(fs.existsSync(path.join(PUBLIC_DIR, riveUrl!))).toBe(true);
  });
});

describe('outbound links', () => {
  const hrefs = componentFiles.flatMap(({ file, content }) =>
    [...content.matchAll(/href="([^"]*)"/g)].map((m) => ({ file, href: m[1] })),
  );

  it('found links to check', () => {
    expect(hrefs.length).toBeGreaterThan(20);
  });

  it('has no root-relative links left un-absolutised', () => {
    // Every internal link must point back at the real site, since only the
    // homepage exists in this replica.
    const relative = hrefs.filter(({ href }) => href.startsWith('/'));
    expect(relative).toEqual([]);
  });

  it('only contains absolute, anchor, mailto or tel links', () => {
    const invalid = hrefs.filter(
      ({ href }) =>
        !(
          href === '' ||
          href === '#' ||
          href.startsWith('#') ||
          href.startsWith('http://') ||
          href.startsWith('https://') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:')
        ),
    );
    expect(invalid).toEqual([]);
  });

  it('points internal navigation at www.coframe.com', () => {
    const coframeLinks = hrefs.filter(({ href }) => href.includes('coframe.com'));
    expect(coframeLinks.length).toBeGreaterThan(10);
  });

  it('keeps the nav and footer pointing at real coframe pages', () => {
    const nav = componentFiles.find((f) => f.file.includes('NavSection'))!;
    for (const expected of [
      'https://www.coframe.com/blog',
      'https://www.coframe.com/careers',
    ]) {
      expect(nav.content + componentFiles.map((f) => f.content).join('')).toContain(expected);
    }
  });
});

describe('stylesheet wiring', () => {
  it('imports the stylesheets in the right order in layout.tsx', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'app', 'layout.tsx'), 'utf8');
    const order = ['fonts.css', 'webflow.css', 'embedded/index.css', 'globals.css'].map((f) =>
      layout.indexOf(f),
    );
    expect(order.every((i) => i !== -1)).toBe(true);
    expect([...order]).toEqual([...order].sort((a, b) => a - b));
  });

  it('aggregates every extracted style embed', () => {
    const embeddedDir = path.join(STYLES_DIR, 'embedded');
    const barrel = fs.readFileSync(path.join(embeddedDir, 'index.css'), 'utf8');
    const embeds = fs
      .readdirSync(embeddedDir)
      .filter((f) => f.endsWith('.css') && f !== 'index.css');

    expect(embeds.length).toBeGreaterThanOrEqual(20);
    for (const embed of embeds) {
      expect(barrel).toContain(embed);
    }
  });

  it('ships the Webflow stylesheet in full', () => {
    const webflow = fs.statSync(path.join(STYLES_DIR, 'webflow.css'));
    // The live stylesheet is ~217KB.
    expect(webflow.size).toBeGreaterThan(150_000);
  });

  it('defines the marquee keyframes the IX2 loop was replaced with', () => {
    const globals = fs.readFileSync(path.join(ROOT, 'app', 'globals.css'), 'utf8');
    expect(globals).toContain('@keyframes logo-marquee-scroll');
    // -50% is what makes the duplicated logo list loop seamlessly.
    expect(globals).toContain('translateX(-50%)');
  });
});
