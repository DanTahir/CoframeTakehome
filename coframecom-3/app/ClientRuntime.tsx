'use client';

/**
 * Re-applies the behaviours the original page's JavaScript provided.
 *
 * Codegen captures the DOM *before* scroll and strips runtime-added classes,
 * so the markup starts in its pristine pre-animation state. Everything that
 * made the page feel alive is re-implemented here.
 *
 * This site needed most of its behaviour ported specifically rather than taken
 * from the template's generic effects, because coframe.com is a Webflow site
 * whose motion came from two sources the codegen sanitizer necessarily strips:
 * ~30 inline `<script>` blocks (recovered under `scrape/analysis/script-*.js`)
 * and Webflow's IX2 interactions runtime (recovered out of the minified
 * `webflow.schunk.*.js` payload). Each `coframe*` module below documents the
 * exact upstream source it was transcribed from.
 *
 * Where a generic effect is dropped or replaced, the reason is recorded inline
 * so a later edit does not "helpfully" re-add it and reintroduce a bug.
 */

import { useEffect } from 'react';
import {
  createForms,
  initAccordion,
  initCoframeCursor,
  initCoframeFadeIn,
  initCoframeForms,
  initCoframeHeroAnim,
  initCoframeMarquee,
  initCoframeNav,
  initCoframeNewsletter,
  initCoframeSwipers,
  createCoframeRive,
  initCounters,
  initLazyImages,
  initSmoothAnchors,
  initEffects,
  type RegisteredEffect,
} from './lib';

const effects: RegisteredEffect[] = [
  // --- site-specific ports --------------------------------------------------
  // Scroll fade-ins. Replaces the generic `createFadeIn`: upstream
  // (script-21.js) uses selector `.fade-in` only, threshold 0.4, and a
  // data-fade-delay keyword -> animationDelay map that the generic one lacks.
  { name: 'coframeFadeIn', init: initCoframeFadeIn },

  // Nav scroll-darkening, mobile menu (data-nav-menu-open), and the hand-built
  // dropdown. Replaces generic navToggle/navScroll/navDropdown: `coframeNav`
  // owns `.w-nav-menu`, so registering `initNavToggle` too would bind the same
  // elements twice. Its dropdown code also deliberately never touches
  // `position` inline — two same-specificity rules (desktop absolute / mobile
  // relative) rely on the cascade owning that property.
  { name: 'coframeNav', init: initCoframeNav },

  // Hero entrance fades: Webflow IX2 action list "a-3" (event e-3, PAGE_START).
  { name: 'coframeHeroAnim', init: initCoframeHeroAnim },

  // Logo marquee: IX2 action list "a" (event e, PAGE_START, loop). Replaces the
  // generic `initMarquee`, whose `[class*="marquee"]` selector matches five
  // nested classes here and would clone children at several levels at once.
  { name: 'coframeMarquee', init: initCoframeMarquee },

  // Case-studies carousel + Introduction step tabs. Replaces the generic
  // `initTabs`, which would double-bind the same step elements.
  { name: 'coframeSwipers', init: initCoframeSwipers },

  // Hero headline retyping cursor.
  { name: 'coframeCursor', init: initCoframeCursor },

  // Hero impact chart + its replay choreography (IX2 "a-4", event e-5).
  // Must be the webgl2 build: this .riv renders blank under @rive-app/canvas.
  {
    name: 'coframeRive',
    init: createCoframeRive({ load: () => import('@rive-app/webgl2') }),
  },

  // Hero waitlist form: validates, blocks free-mail domains, and intercepts
  // submission locally instead of navigating to start.coframe.com.
  { name: 'coframeForms', init: initCoframeForms },

  // Newsletter validation + submit triggering (script-20.js). Required because
  // `.newsletter-form__button` is an <a href="#">, not a submit control: no
  // `submit` event is ever fired by clicking it, and the bare `#` would
  // otherwise jump the page to the top. Must be registered BEFORE the generic
  // interception effect below, which catches the submit this one triggers.
  { name: 'coframeNewsletter', init: initCoframeNewsletter },

  // --- generic effects, kept -------------------------------------------------
  // Newsletter form only, and only as the *interception* layer: it cancels the
  // submit that `coframeNewsletter` triggers so nothing is POSTed anywhere, and
  // reveals the site's own `.w-form-done` block. Scoped deliberately — the hero
  // form is owned by `coframeForms`, and two submit handlers on one form would
  // double-fire.
  { name: 'newsletterForm', init: createForms({ formSelector: '.newsletter-form__form' }) },
  { name: 'smoothAnchors', init: initSmoothAnchors },
  { name: 'accordion', init: initAccordion },
  { name: 'counters', init: initCounters },
  { name: 'lazyImages', init: initLazyImages },
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
