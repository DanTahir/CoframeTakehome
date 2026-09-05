/**
 * Runtime registry.
 *
 * The original homepage ships ~20 inline scripts that each hook
 * `DOMContentLoaded` or `load` independently. Here every behaviour is a module
 * exporting `init...(): () => void` (an idempotent setup returning its own
 * teardown), and this file starts them in the same order the inline scripts
 * appear in the document so any incidental ordering dependency is preserved.
 *
 * Analytics, A/B testing and anti-flicker scripts (GTM, Amplitude, Heap,
 * Segment, Intellimize, the Coframe snippet itself, MathJax, Fancybox's
 * deferred loader) are deliberately NOT ported: they only phone home to
 * third parties and would make the replica load remote code.
 */

import { initCursorContainer } from './cursorContainer';
import { initCursorNames } from './cursorNames';
import { initCursorRetype } from './cursorRetype';
import { initFadeIn } from './fadeIn';
import { initHeroForm } from './heroForm';
import { initHeroSpotlight } from './heroSpotlight';
import { initNavDropdowns } from './navDropdown';
import { initNavScroll } from './navScroll';
import { initNewsletterForm } from './newsletterForm';
import { initRiveChart } from './riveChart';
import { initSwipers } from './swipers';
import { initWebflowNav } from './webflowNav';

export type Teardown = () => void;
export type Initializer = () => Teardown;

/**
 * Ordered to match the inline scripts' positions in the source document:
 * nav widget -> nav theming -> dropdowns -> spotlight -> hero form ->
 * newsletter -> fade-in -> cursor names -> cursor container -> retype engine
 * -> swipers -> Rive chart.
 */
export const INITIALIZERS: ReadonlyArray<{ name: string; init: Initializer }> = [
  { name: 'webflowNav', init: initWebflowNav },
  { name: 'navScroll', init: initNavScroll },
  { name: 'navDropdowns', init: initNavDropdowns },
  { name: 'heroSpotlight', init: initHeroSpotlight },
  { name: 'heroForm', init: initHeroForm },
  { name: 'newsletterForm', init: initNewsletterForm },
  { name: 'fadeIn', init: initFadeIn },
  { name: 'cursorNames', init: () => { initCursorNames(); return () => {}; } },
  { name: 'cursorContainer', init: initCursorContainer },
  { name: 'cursorRetype', init: initCursorRetype },
  { name: 'swipers', init: initSwipers },
  { name: 'riveChart', init: initRiveChart },
];

/**
 * Boots every behaviour and returns a single teardown that unwinds them in
 * reverse order. A failure in one module is logged and skipped rather than
 * aborting the rest of the page.
 */
export function startRuntime(): Teardown {
  const teardowns: Teardown[] = [];

  for (const { name, init } of INITIALIZERS) {
    try {
      teardowns.push(init());
    } catch (error) {
      console.error(`[coframe3] failed to initialise "${name}"`, error);
    }
  }

  return () => {
    for (const teardown of teardowns.reverse()) {
      try {
        teardown();
      } catch (error) {
        console.error('[coframe3] teardown failed', error);
      }
    }
  };
}
