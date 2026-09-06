'use client';

/**
 * Re-applies the behaviours the original page's JavaScript provided.
 *
 * Codegen captures the DOM *before* scroll and strips runtime-added classes,
 * so the markup starts in its pristine pre-animation state. Everything that
 * made the page feel alive is re-implemented here.
 *
 * Every effect below is a faithful port of a specific captured script (see the
 * header comment in each `app/lib/coframe*.ts` module for which one, and for
 * the quirks that were deliberately preserved).
 *
 * WHY THE GENERIC TEMPLATE EFFECTS ARE MOSTLY UNUSED HERE:
 * the template ships broad heuristic effects (`createFadeIn`, `initNavScroll`,
 * `initTabs`, `initForms`, ...). On this site they would DOUBLE-BIND the real
 * ports, because the markup matches both:
 *   - `initForms` (selector `form`) would also grab `.hero__form`, which
 *     `initCoframeHeroForm` already owns -> two submit handlers, two alerts.
 *     It is therefore scoped to the footer newsletter form only.
 *   - `initTabs` (selector `.w-tab-link`) would also grab `.introduction__step`,
 *     which `initCoframeSwipers` drives in lockstep with the carousel -> the
 *     tab strip and the slider would fight each other. Dropped entirely.
 *   - `createFadeIn` / `initNavScroll` / `initNavDropdown` are replaced by their
 *     `coframe*` equivalents, which use the site's real classes, thresholds and
 *     per-element `data-fade-delay` map.
 */

import { useEffect } from 'react';
import {
  createForms,
  initAccordion,
  initCoframeCursorContainer,
  initCoframeCursorNames,
  initCoframeFadeIn,
  initCoframeHeroForm,
  initCoframeHeroSpotlight,
  initCoframeNavDropdown,
  initCoframeNavTheme,
  initCoframeNavToggle,
  initCoframeRetype,
  initCoframeRive,
  initCoframeSwipers,
  initEffects,
  initLazyImages,
  initSmoothAnchors,
  type RegisteredEffect,
} from './lib';

/**
 * Order matters in two places:
 *  - `cursorContainer` runs before `retype`, because the retype engine parents
 *    its cursor clones into `#cursor-container` and needs it already sized.
 *  - `cursorNames` runs before `retype`, so the randomised visitor name is
 *    baked into the cursor *before* it gets cloned (otherwise clones would
 *    show the placeholder name).
 */
const effects: RegisteredEffect[] = [
  // --- nav ------------------------------------------------------------------
  { name: 'navToggle', init: initCoframeNavToggle },
  { name: 'navTheme', init: initCoframeNavTheme },
  { name: 'navDropdown', init: initCoframeNavDropdown },

  // --- reveal ---------------------------------------------------------------
  { name: 'fadeIn', init: initCoframeFadeIn },

  // --- hero -----------------------------------------------------------------
  { name: 'heroSpotlight', init: initCoframeHeroSpotlight },
  { name: 'cursorContainer', init: initCoframeCursorContainer },
  { name: 'cursorNames', init: initCoframeCursorNames },
  { name: 'retype', init: initCoframeRetype },
  { name: 'rive', init: initCoframeRive },

  // --- carousels (also drives the introduction tab strip) -------------------
  { name: 'swipers', init: initCoframeSwipers },

  // --- forms ----------------------------------------------------------------
  { name: 'heroForm', init: initCoframeHeroForm },
  {
    name: 'newsletterForm',
    // Scoped to the footer form so it can't double-bind the hero form.
    init: createForms({ formSelector: '.newsletter-form__form' }),
  },

  // --- generic, no-op when their targets are absent -------------------------
  { name: 'smoothAnchors', init: initSmoothAnchors },
  { name: 'lazyImages', init: initLazyImages },
  { name: 'accordion', init: initAccordion },
];

export default function ClientRuntime() {
  useEffect(() => {
    // Deferred one frame so the generated markup is committed and laid out
    // before any effect measures it (the retype engine measures its content
    // box to size the fly-in clone, so it must not run pre-layout).
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
