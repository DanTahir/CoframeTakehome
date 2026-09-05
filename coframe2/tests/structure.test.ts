// Page-level structure, CSS integrity, and the client runtime's wiring.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { PROJECT_ROOT, countIn, mountBody, readProjectFile, unmountBody } from './helpers';

const STYLES_DIR = path.join(PROJECT_ROOT, 'app', 'styles');

describe('page structure', () => {
  it('mounts the full page and finds every major section', () => {
    mountBody();

    for (const selector of [
      '#cursor-container',
      '.nav',
      '.hero',
      '.footer',
      '.impact',
      '.introduction',
      '.swiper.swiper-case-studies',
    ]) {
      expect(countIn(document, selector), selector).toBeGreaterThan(0);
    }

    unmountBody();
  });

  it('renders the hero headline retype target', () => {
    mountBody();
    expect(countIn(document, '[data-retype-text]')).toBeGreaterThan(0);
    unmountBody();
  });

  it('renders the case-study slides the carousel loops over', () => {
    mountBody();
    expect(countIn(document, '.swiper-slide.cc-case-studies')).toBe(3);
    unmountBody();
  });

  it('renders the three "how it works" tabs', () => {
    mountBody();
    expect(countIn(document, '.introduction__step')).toBe(3);
    expect(countIn(document, '.introduction .w-tab-pane')).toBe(3);
    unmountBody();
  });

  it('renders the hero Rive canvas exactly once', () => {
    mountBody();
    expect(countIn(document, 'canvas')).toBe(1);
    expect(countIn(document, '[data-animation-type="rive"] canvas')).toBe(1);
    unmountBody();
  });

  it('renders both cursor kinds for the multiplayer animation', () => {
    mountBody();
    expect(countIn(document, '.cursor[data-is-coframe-cursor="true"]')).toBeGreaterThan(0);
    expect(countIn(document, '.cursor[data-is-coframe-cursor="false"]')).toBeGreaterThan(0);
    unmountBody();
  });

  it('keeps every image lazily or eagerly loaded with dimensions intact', () => {
    mountBody();
    const imgs = Array.from(document.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThan(30);
    // Every image resolves to a self-hosted asset.
    const remote = imgs.filter((i) => /^https?:/.test(i.getAttribute('src') ?? ''));
    expect(remote).toEqual([]);
    unmountBody();
  });
});

describe('stylesheet integrity', () => {
  const files = readdirSync(STYLES_DIR).filter((f) => f.endsWith('.css'));

  it('ships the full set of self-hosted stylesheets', () => {
    for (const name of ['fonts.css', 'webflow.css', 'vendor.css', 'embedded.css', 'globals.css']) {
      expect(files, name).toContain(name);
    }
  });

  it('carries the real Webflow stylesheet, not a stub', () => {
    const css = readFileSync(path.join(STYLES_DIR, 'webflow.css'), 'utf8');
    expect(css.length).toBeGreaterThan(100_000);
    expect(css).toContain('.hero');
    expect(css).toContain('.nav');
  });

  it('defines the animation custom properties the engine reads', () => {
    const css = readdirSync(STYLES_DIR)
      .map((f) => readFileSync(path.join(STYLES_DIR, f), 'utf8'))
      .join('\n');
    expect(css).toContain('--letter-effect-duration');
  });

  it('declares self-hosted @font-face rules', () => {
    const css = readFileSync(path.join(STYLES_DIR, 'fonts.css'), 'utf8');
    expect(css).toContain('@font-face');
    expect(css).toMatch(/url\(['"]?\/assets\/fonts\//);
  });

  it('imports the stylesheets in the original cascade order', () => {
    const layout = readProjectFile(path.join('app', 'layout.tsx'));
    const order = ['fonts.css', 'webflow.css', 'vendor.css', 'embedded.css', 'globals.css'].map(
      (name) => layout.indexOf(name),
    );
    expect(order.every((i) => i !== -1)).toBe(true);
    // Strictly increasing: cascade order matters for overrides.
    for (let i = 1; i < order.length; i++) {
      expect(order[i]).toBeGreaterThan(order[i - 1]);
    }
  });

  it('neutralises the anti-flicker rules whose scripts were excluded', () => {
    const globals = readFileSync(path.join(STYLES_DIR, 'globals.css'), 'utf8');
    expect(globals).toContain('anti-flicker');
    expect(globals).toContain('data-wf-hidden-variation');
  });
});

describe('document metadata', () => {
  const layout = readProjectFile(path.join('app', 'layout.tsx'));

  it('carries the live page title and description', () => {
    expect(layout).toContain('Coframe');
    expect(layout).toMatch(/description/);
  });

  it('declares the language and Webflow domain attributes', () => {
    expect(layout).toContain('lang="en"');
    expect(layout).toContain('data-wf-domain');
  });

  it('uses the self-hosted favicon and apple touch icon', () => {
    expect(layout).toMatch(/\/assets\/media\/[^'"]*icon/i);
  });

  it('keeps the body class the original stylesheet targets', () => {
    expect(layout).toContain('className="body"');
  });
});

describe('client runtime wiring', () => {
  const runtime = readProjectFile(path.join('app', 'components', 'ClientRuntime.tsx'));

  it('is a client component', () => {
    expect(runtime.startsWith("'use client'")).toBe(true);
  });

  it('boots every ported behaviour module', () => {
    for (const fn of [
      'initRiveAnimations',
      'initFadeIn',
      'initNavScroll',
      'initNavDropdowns',
      'initHeroSpotlight',
      'initHeroForm',
      'initNewsletterForm',
      'initCursorNames',
      'initCursorContainer',
      'initSwipers',
      'startCursorAnimations',
    ]) {
      expect(runtime, fn).toContain(fn);
    }
  });

  it('sets the Webflow js/touch mode classes the CSS keys off', () => {
    expect(runtime).toContain('w-mod-js');
    expect(runtime).toContain('w-mod-touch');
  });

  it('cleans up on unmount', () => {
    expect(runtime).toMatch(/return\s*\(\)\s*=>/);
  });
});

describe('excluded third-party tracking', () => {
  it('ships no analytics or tracking code in the app source', () => {
    const appDir = path.join(PROJECT_ROOT, 'app');

    const collect = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return collect(full);
        return /\.(tsx?|css)$/.test(entry.name) ? [readFileSync(full, 'utf8')] : [];
      });

    const source = collect(appDir).join('\n');

    // Host-qualified on purpose: the page legitimately shows an Amplitude logo in
    // the integrations strip (amplitude.svg), so a bare vendor name would match
    // real page content rather than tracking code.
    for (const marker of [
      'googletagmanager.com',
      'analytics.segment',
      'cdn.intellimize',
      'posthog.com',
      'amplitude.com',
      'heap.io',
      'gtag(',
    ]) {
      expect(source, marker).not.toContain(marker);
    }
  });
});
