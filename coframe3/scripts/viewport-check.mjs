/**
 * Real-device viewport verification.
 *
 * Drives the cached Playwright Chromium directly (via playwright-core, so no
 * browser download) against the local replica and, optionally, the live site.
 * For each viewport it records layout metrics that catch the failure modes a
 * desktop-only check misses:
 *
 *   - horizontal overflow (documentElement.scrollWidth > innerWidth)
 *   - any element wider than the viewport (the usual culprit behind it)
 *   - whether the burger button / desktop menu swap at the right breakpoint
 *   - the Rive canvas actually having a non-zero, dpr-scaled backing store
 *   - console errors and failed asset requests
 *
 * Usage:
 *   node scripts/viewport-check.mjs [--url=http://localhost:3311] [--live] [--shots]
 */

import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CHROMIUM_ROOT = join(
  process.env.LOCALAPPDATA ?? join(process.env.HOME ?? '', 'AppData', 'Local'),
  'ms-playwright',
);

/** Finds the newest cached chromium build, since the version is not stable. */
function findChromium() {
  const builds = readdirSync(CHROMIUM_ROOT)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));

  for (const build of builds) {
    const exe = join(CHROMIUM_ROOT, build, 'chrome-win64', 'chrome.exe');
    try {
      readdirSync(join(CHROMIUM_ROOT, build, 'chrome-win64'));
      return exe;
    } catch {
      /* try next */
    }
  }
  throw new Error(`No cached Chromium found under ${CHROMIUM_ROOT}`);
}

const VIEWPORTS = [
  { name: 'iphone-se', width: 375, height: 667, dpr: 2, mobile: true },
  { name: 'iphone-14-pro', width: 393, height: 852, dpr: 3, mobile: true },
  { name: 'pixel-7', width: 412, height: 915, dpr: 2.625, mobile: true },
  { name: 'ipad-mini', width: 768, height: 1024, dpr: 2, mobile: true },
  { name: 'ipad-pro', width: 1024, height: 1366, dpr: 2, mobile: false },
  { name: 'laptop', width: 1440, height: 900, dpr: 1, mobile: false },
  { name: 'desktop-wide', width: 1920, height: 1080, dpr: 1, mobile: false },
];

/**
 * Overflow that the LIVE SITE also exhibits, verified by running this same
 * harness against https://www.coframe.com/. Reproducing it is fidelity, not a
 * bug, so it is baselined rather than "fixed".
 *
 * `.cursor-container` is sized to `document.scrollWidth` by the original
 * inline script; because the container is itself in the document, that is a
 * self-reinforcing measurement. At exactly 1024px the marquee transiently
 * widens the document to 1051px and the container latches that width.
 * Measured identically on local and live: scrollWidth 1051 vs innerWidth 1024.
 */
const KNOWN_UPSTREAM_OVERFLOW = {
  'ipad-pro': { by: 27, culprit: 'div.cursor-container' },
};

const args = process.argv.slice(2);
const urlArg = args.find((a) => a.startsWith('--url='));
const LOCAL_URL = urlArg ? urlArg.split('=')[1] : 'http://localhost:3311';
const CHECK_LIVE = args.includes('--live');
const SHOTS = args.includes('--shots');
const SHOT_DIR = 'scrape/shots';

/** Collected in the page; must be self-contained. */
function collectMetrics() {
  const de = document.documentElement;
  const vw = window.innerWidth;

  const tooWide = [];
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Only flag things that actually extend past the right edge; a wide
    // element scrolled off-screen inside a carousel is fine.
    if (r.width > vw + 1 && r.right > vw + 1) {
      const style = getComputedStyle(el);
      if (style.position === 'fixed') continue;
      tooWide.push({
        sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
          : ''),
        width: Math.round(r.width),
        right: Math.round(r.right),
      });
    }
  }

  const canvas = document.querySelector('canvas');
  const burger = document.querySelector('.w-nav-button');
  const menu = document.querySelector('.w-nav-menu');

  return {
    innerWidth: vw,
    dpr: window.devicePixelRatio,
    scrollWidth: de.scrollWidth,
    scrollHeight: de.scrollHeight,
    overflowX: de.scrollWidth > vw + 1,
    overflowBy: de.scrollWidth - vw,
    tooWide: tooWide.slice(0, 8),
    tooWideCount: tooWide.length,
    burgerDisplay: burger ? getComputedStyle(burger).display : null,
    menuDisplay: menu ? getComputedStyle(menu).display : null,
    canvas: canvas
      ? {
          backing: `${canvas.width}x${canvas.height}`,
          css: `${Math.round(canvas.getBoundingClientRect().width)}x${Math.round(
            canvas.getBoundingClientRect().height,
          )}`,
          painted: canvas.width > 0 && canvas.height > 0,
        }
      : null,
    fadeIn: document.querySelectorAll('.fade-in').length,
    faded: document.querySelectorAll('.fade-in.faded-in').length,
    swipersInit: document.querySelectorAll('.swiper-initialized').length,
    images: document.images.length,
    brokenImages: Array.from(document.images)
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => i.currentSrc || i.src)
      .slice(0, 5),
    h1: document.querySelector('h1')?.textContent?.trim().replace(/\s+/g, ' ') ?? null,
  };
}

async function auditPage(browser, label, url, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.dpr,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    userAgent: viewport.mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });

  const consoleErrors = [];
  const failedRequests = [];
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url().slice(0, 120)}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url().slice(0, 120)}`);
  });

  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  // Let Rive parse, swipers initialise and fonts settle.
  await page.waitForTimeout(3500);

  const metrics = await page.evaluate(collectMetrics);

  // Scroll the whole page to trigger the IntersectionObserver fade-ins, then
  // re-measure: overflow often only appears once lower sections are laid out.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 250));
  });

  const afterScroll = await page.evaluate(collectMetrics);

  if (SHOTS) {
    mkdirSync(SHOT_DIR, { recursive: true });
    await page.screenshot({
      path: join(SHOT_DIR, `${label}-${viewport.name}.jpg`),
      type: 'jpeg',
      quality: 70,
      fullPage: false,
    });
  }

  await context.close();
  return { metrics, afterScroll, consoleErrors, failedRequests };
}

const browser = await chromium.launch({ executablePath: findChromium(), headless: true });

const targets = [{ label: 'local', url: LOCAL_URL }];
if (CHECK_LIVE) targets.push({ label: 'live', url: 'https://www.coframe.com/' });

let failures = 0;

for (const target of targets) {
  console.log(`\n${'='.repeat(74)}\n${target.label.toUpperCase()}  ${target.url}\n${'='.repeat(74)}`);

  for (const viewport of VIEWPORTS) {
    const { metrics, afterScroll, consoleErrors, failedRequests } = await auditPage(
      browser,
      target.label,
      target.url,
      viewport,
    );

    const overflow = metrics.overflowX || afterScroll.overflowX;
    const badImages = afterScroll.brokenImages.length;
    const isLocal = target.label === 'local';

    const quirk = KNOWN_UPSTREAM_OVERFLOW[viewport.name];
    const isBaselined = Boolean(quirk) && Math.abs(afterScroll.overflowBy - quirk.by) <= 2;
    const unexpectedOverflow = overflow && !isBaselined;

    // Only gate on the local replica; the live site is a reference, not a test.
    if (isLocal && (unexpectedOverflow || badImages || consoleErrors.length)) failures += 1;

    const flag = unexpectedOverflow
      ? 'OVERFLOW'
      : overflow
        ? `ok (baselined +${quirk.by}px, matches live)`
        : 'ok';
    console.log(
      `\n[${viewport.name}] ${viewport.width}x${viewport.height} @${viewport.dpr}x ` +
        `${viewport.mobile ? 'mobile' : 'desktop'} -> ${flag}`,
    );
    console.log(
      `  scrollWidth ${afterScroll.scrollWidth} vs innerWidth ${afterScroll.innerWidth}` +
        (overflow ? `  (+${afterScroll.overflowBy}px)` : ''),
    );
    console.log(`  page height   ${afterScroll.scrollHeight}px`);
    console.log(`  burger/menu   ${afterScroll.burgerDisplay} / ${afterScroll.menuDisplay}`);
    console.log(
      `  rive canvas   ${afterScroll.canvas ? `${afterScroll.canvas.backing} backing, ${afterScroll.canvas.css} css, painted=${afterScroll.canvas.painted}` : 'none'}`,
    );
    console.log(`  fade-in       ${afterScroll.faded}/${afterScroll.fadeIn} faded after scroll`);
    console.log(`  swipers       ${afterScroll.swipersInit} initialised`);
    console.log(`  images        ${afterScroll.images} (${badImages} broken)`);

    if (afterScroll.tooWideCount) {
      console.log(`  elements wider than viewport: ${afterScroll.tooWideCount}`);
      for (const el of afterScroll.tooWide) {
        console.log(`    - ${el.sel}  w=${el.width} right=${el.right}`);
      }
    }
    if (badImages) for (const src of afterScroll.brokenImages) console.log(`    broken: ${src}`);
    if (consoleErrors.length) {
      console.log(`  console errors: ${consoleErrors.length}`);
      for (const e of consoleErrors.slice(0, 4)) console.log(`    ! ${e}`);
    }
    if (failedRequests.length) {
      const unique = [...new Set(failedRequests)];
      console.log(`  failed requests: ${unique.length}`);
      for (const r of unique.slice(0, 4)) console.log(`    ! ${r}`);
    }
  }
}

await browser.close();

console.log(
  `\n${'='.repeat(74)}\n${failures === 0 ? 'PASS' : 'FAIL'}: ${failures} local viewport(s) with problems\n`,
);
process.exit(failures === 0 ? 0 : 1);
