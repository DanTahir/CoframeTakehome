'use client';

/**
 * Re-applies the behaviours the original page's JavaScript provided.
 *
 * Codegen captures the DOM *before* scroll and strips runtime-added classes and
 * inline animation styles, so the generated markup starts in its pristine
 * pre-animation state. Everything that made the page feel alive is
 * re-implemented here.
 *
 * WHY THIS FILE USES ALMOST NONE OF THE TEMPLATE'S GENERIC EFFECTS
 * ----------------------------------------------------------------
 * coframe.com ships ~14 of its own inline scripts (captured under
 * `scrape/analysis/`), and its markup does not follow the conventions the
 * template's generic helpers assume. Each generic effect was checked against
 * the real markup and deliberately dropped:
 *
 *   - `createFadeIn`      → replaced by `initCoframeFadeIn`. The site keys its
 *                           threshold off a per-element `data-fade-threshold`
 *                           (default 0.4, not the generic 0.15) and staggers
 *                           via `data-fade-delay` buckets.
 *   - `initNavToggle`     → replaced by `initCoframeNavToggle`. The open state
 *                           must be the `data-nav-menu-open` ATTRIBUTE that the
 *                           captured CSS and the nav theme observer both read,
 *                           not the generic `is-open` class.
 *   - `initNavScroll`     → replaced by `initCoframeNavTheme` (a 50px threshold
 *                           toggling `cc-dark` across a specific element list).
 *   - `initNavDropdown`   → replaced by `initCoframeNavDropdowns` (id-paired
 *                           toggles, hover on desktop / tap on mobile, plus
 *                           backdrop blur on the page content).
 *   - `initTabs`          → replaced by `initCoframeIntroTabs`, which also owns
 *                           the autoplay and the anchor-hijack fix.
 *   - `initMarquee`       → replaced by `initCoframeMarquee`. The generic one
 *                           CLONES children to build a loop, but this markup
 *                           already ships two logo sets and `[class*="marquee"]`
 *                           matches five nested classes here, so it would clone
 *                           a third set and desynchronise the -50% wrap.
 *   - `initForms`         → replaced by `initCoframeHeroForm` /
 *                           `initCoframeNewsletterForm`, which reproduce the
 *                           site's real validation and intercept submission
 *                           locally instead of posting to Webflow or
 *                           redirecting to start.coframe.com.
 *   - `initSmoothAnchors` → dropped entirely. The original page has no
 *                           smooth-anchor script, and adding one is actively
 *                           dangerous here (see the autoscroll note below).
 *   - `initAccordion`, `initCounters`, `initLazyImages` → dropped: the page has
 *                           no accordions and no counter elements, and its 94
 *                           lazy images use native `loading="lazy"` rather than
 *                           the `data-src` pattern the helper looks for.
 *
 * FORCED-AUTOSCROLL HAZARD (regression guard)
 * -------------------------------------------
 * The introduction stepper's tab controls are `<a href="#...">` anchors, and
 * upstream's autoplay advances them with `tabs[i].click()`. Left alone, every
 * synthetic click performs default anchor navigation and yanks the viewport
 * back to that section on a timer — a bug a previous run of this replica
 * shipped. Two independent defences: `initCoframeIntroTabs` calls
 * `preventDefault()` and drives autoplay through its internal activate
 * function rather than a synthetic click, AND no smooth-anchor effect is
 * registered at all.
 */

import { useEffect } from 'react';
import { initEffects, type RegisteredEffect } from './lib/runtime';
import { initCoframeFadeIn } from './lib/coframeFadeIn';
import {
  initCoframeNavDropdowns,
  initCoframeNavTheme,
  initCoframeNavToggle,
} from './lib/coframeNav';
import { initCoframeHeroSpotlight } from './lib/coframeHero';
import { initCoframeHeroForm, initCoframeNewsletterForm } from './lib/coframeForms';
import { initCoframeCursorContainer, initCoframeCursorNames } from './lib/coframeCursor';
import { initCoframeCursorAnimation } from './lib/coframeCursorAnimation';
import { initCoframeMarquee } from './lib/coframeMarquee';
import { initCoframeIntroTabs, initCoframeSwipers } from './lib/coframeSwipers';
import { createCoframeRiveChart } from './lib/coframeRiveChart';

/**
 * Order mirrors the original page's script order, which matters in two places:
 * the cursor name randomiser must run before the cursor animation clones those
 * nodes, and the cursor container must be sized before clones are positioned
 * inside it.
 */
const effects: RegisteredEffect[] = [
  { name: 'navTheme', init: initCoframeNavTheme },
  { name: 'navDropdowns', init: initCoframeNavDropdowns },
  { name: 'navToggle', init: initCoframeNavToggle },
  { name: 'heroSpotlight', init: initCoframeHeroSpotlight },
  { name: 'heroForm', init: initCoframeHeroForm },
  { name: 'newsletterForm', init: initCoframeNewsletterForm },
  { name: 'fadeIn', init: initCoframeFadeIn },
  { name: 'cursorNames', init: initCoframeCursorNames },
  { name: 'cursorContainer', init: initCoframeCursorContainer },
  { name: 'cursorAnimation', init: initCoframeCursorAnimation },
  { name: 'marquee', init: initCoframeMarquee },
  { name: 'swipers', init: initCoframeSwipers },
  { name: 'introTabs', init: initCoframeIntroTabs },
  {
    name: 'riveChart',
    // Renderer build is load-bearing: this .riv is a webgl2 export and renders
    // a blank canvas under @rive-app/canvas with no error whatsoever.
    init: createCoframeRiveChart({ load: () => import('@rive-app/webgl2') }),
  },
];

export default function ClientRuntime() {
  useEffect(() => {
    // Deferred one frame so the generated markup is committed and laid out
    // before any effect measures it (the cursor layer reads document geometry).
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
