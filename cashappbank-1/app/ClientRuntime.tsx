'use client';

/**
 * Re-applies the behaviours the original page's JavaScript provided.
 *
 * Codegen captures the DOM *before* scroll and strips runtime-added classes,
 * so the markup starts in its pristine pre-animation state. Everything that
 * made the page feel alive is re-implemented here.
 *
 * WHAT THIS PAGE NEEDED (cash.app/bank)
 * -------------------------------------
 * `scrape/features.json` reports no third-party animation libraries (no Swiper,
 * Rive, Lottie, GSAP, AOS) — the page is plain React. So none of the opt-in
 * library adapters are used. What it *does* need is four site-specific effects,
 * each a re-implementation of a real component recovered from the captured JS
 * chunks (see the header comment in each module for the recovered source):
 *
 *   cashVideos        6 `<video>` elements ship with no `src`/`<source>` at all;
 *                     sources are chosen client-side per media query, muted is
 *                     set as a DOM property, and playback pauses while the nav
 *                     overlay is open.
 *   cashResponsiveImages
 *                     8 `<img>` nodes swap to an entirely different asset below
 *                     max-width:759px (the hero becomes a different photograph,
 *                     not a rescale). The desktop-only capture baked in the wide
 *                     variants, so phone viewports showed desktop imagery.
 *   cashFaq           11-item single-open accordion.
 *   cashContentToggle 2-panel switcher driven by `data-active` + an `active` class.
 *   cashNav           `data-nav-open` header state, mobile menu overlay, Escape
 *                     to close, and the login button's theme swap.
 *
 * DELIBERATELY NOT REGISTERED
 * ---------------------------
 * `initNavToggle` / `initNavScroll` are omitted. A selector-collision scan of
 * the generated JSX found the generic `nav-menu` selector matches this site's 11
 * real `galleryNavMenuSection` elements, and `cashNav` now owns all header/nav
 * state — registering both would give one behaviour two owners. Every other
 * generic effect scanned to zero matching targets, so they stay registered as
 * documented no-ops (each returns early when its targets are absent).
 */

import { useEffect } from 'react';
import {
  createFadeIn,
  initAccordion,
  initCashContentToggle,
  initCashFaq,
  initCashNav,
  initCashResponsiveImages,
  initCashVideos,
  initCounters,
  initForms,
  initLazyImages,
  initMarquee,
  initNavDropdown,
  initSmoothAnchors,
  initTabs,
  initEffects,
  type RegisteredEffect,
} from './lib';

const effects: RegisteredEffect[] = [
  // --- site-specific: recovered from the original page's components ---------
  { name: 'cashNav', init: initCashNav },
  { name: 'cashVideos', init: initCashVideos },
  { name: 'cashResponsiveImages', init: initCashResponsiveImages },
  { name: 'cashFaq', init: initCashFaq },
  { name: 'cashContentToggle', init: initCashContentToggle },

  // --- generic: scanned to zero targets on this page, kept as safe no-ops ---
  { name: 'fadeIn', init: createFadeIn() },
  { name: 'navDropdown', init: initNavDropdown },
  { name: 'smoothAnchors', init: initSmoothAnchors },
  { name: 'tabs', init: initTabs },
  { name: 'accordion', init: initAccordion },
  { name: 'counters', init: initCounters },
  { name: 'marquee', init: initMarquee },
  { name: 'lazyImages', init: initLazyImages },
  { name: 'forms', init: initForms },
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
