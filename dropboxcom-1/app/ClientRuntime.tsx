'use client';

/**
 * Re-applies the behaviours the original page's JavaScript provided.
 *
 * Codegen captures the DOM *before* scroll and strips runtime-added classes,
 * so the markup starts in its pristine pre-animation state. Everything that
 * made the page feel alive is re-implemented here.
 *
 * HOW TO TUNE THIS FILE (the one file you are expected to hand-edit):
 *   1. Run `npm run codegen`, then read `scrape/analysis/summary.json` and
 *      `scrape/features.json` — they report which libraries and effect classes
 *      the original page actually used.
 *   2. Uncomment / add the matching effects below.
 *   3. If the site's finished-state class is not `faded-in`, pass the real one:
 *      `createFadeIn({ activeClass: 'is-visible' })`.
 *   4. For library-backed effects, install the version `npm run extras`
 *      detected, then supply the dynamic import to the adapter.
 */

import { useEffect } from 'react';
import {
  initDropboxNav,
  initDropboxVideos,
  initSmoothAnchors,
  initEffects,
  type RegisteredEffect,
} from './lib';

/**
 * Registered effects for dropbox.com.
 *
 * Every generic effect in `app/lib` was censused against the captured markup
 * before being kept or dropped, rather than left registered on the assumption
 * that a missing target is harmless. Two of them were actively harmful here:
 *
 *   navToggle  Its default selectors DO match (burger + 3 `[class*=nav-menu]`
 *              containers), but it applies `is-open`/`nav-open` — classes this
 *              site's CSS never defines — and stamps `aria-expanded` onto a
 *              burger that has none in the live DOM. Replaced by
 *              `initDropboxNav`, which drives the real `dwg-*` classes.
 *   marquee    Matches the logo ticker, but that ticker is ALREADY animated by
 *              CSS (`_animationStandard_90hav_27`, driven by an inline
 *              `--dwg-animation__ticker__duration-ms: 90000ms`) over logo
 *              lists the markup already duplicates — which is exactly what the
 *              -30%→-50% keyframes assume. Cloning the children again would
 *              desynchronise the wrap point and visibly break the loop.
 *
 * Dropped as genuine zero-target no-ops (kept out to keep this list honest
 * about what the page actually does): fadeIn (0 `.fade-in/[data-fade]`),
 * navScroll (0 `header/.navbar` — this nav is `nav.dwg-nav` and its stickiness
 * is pure CSS), navDropdown (0 Webflow `.w-dropdown`), tabs (0 `[role=tab]`),
 * accordion (0 `.accordion-item`), counters, parallax, typewriter, forms (0
 * `<form>`), and lazyImages (0 `img[data-src]` — the 77 lazy images here use
 * native `loading="lazy"`, which the browser handles).
 */
const effects: RegisteredEffect[] = [
  // Dropdowns (6 triggers) + mobile burger, driven via the site's own classes.
  { name: 'dropboxNav', init: initDropboxNav },
  // Forces the `muted` DOM property so the 4 product videos actually autoplay.
  { name: 'dropboxVideos', init: initDropboxVideos },
  // 2 real in-page `a[href^="#"]` targets.
  { name: 'smoothAnchors', init: initSmoothAnchors },
];

export default function ClientRuntime() {
  useEffect(() => {
    // Deferred one frame so the generated markup is committed and laid out
    // before any effect measures it (counters/parallax read geometry).
    let teardown: (() => void) | undefined;
    const raf = requestAnimationFrame(() => {
      teardown = initEffects(effects);
    });
    return () => {
      cancelAnimationFrame(raf);
      teardown?.();
    };
  }, []);

  return null;
}
