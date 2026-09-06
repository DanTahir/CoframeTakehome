/**
 * Logo marquee — ported from Webflow IX2 action list "a" ("Logo Animation").
 *
 * There are NO `@keyframes` for this marquee anywhere in the captured CSS: the
 * movement was driven entirely by Webflow's IX2 runtime, and `webflow.js` is
 * stripped by the codegen sanitizer. The timings below are transcribed
 * verbatim from the IX2 payload embedded in
 * `scrape/raw/js/webflow.schunk.571c3827ae3ad973.a275af80.js`:
 *
 *   actionLists.a = { title: "Logo Animation", useFirstGroupAsInitialState: true,
 *     group 1: TRANSFORM_MOVE xValue   0%  duration   500   (initial state)
 *     group 2: TRANSFORM_MOVE xValue -50%  duration 25000   (the scroll)
 *     group 3: TRANSFORM_MOVE xValue   0%  duration     0   (instant restart)
 *   }
 *   events.e = { eventTypeId: "PAGE_START", actionListId: "a", config.loop: true }
 *
 * Because group 1 is only the initial state and group 3 is an instantaneous
 * snap back to 0%, the whole looping sequence is exactly equivalent to one
 * infinitely-repeating linear 0% -> -50% translation over 25s, which is what
 * `element.animate()` expresses natively.
 *
 * IMPORTANT: the captured markup already contains TWO full copies of the logo
 * strip, which is why -50% wraps seamlessly. Never clone a third set — that
 * desynchronises the wrap. This is also why the template's generic
 * `initMarquee` must NOT be registered for this site: its `[class*="marquee"]`
 * selector matches five nested classes here (`.logo-marquee`,
 * `__animation-container`, `__logos`, `__logo`, `__logo-item`) and would clone
 * children at several levels at once.
 */
import { prefersReducedMotion, type EffectInit, type Teardown } from './runtime';

/** The element carrying data-w-id 674d6aa7-c193-2fe4-61dd-3519f496b39e. */
const MARQUEE_SELECTOR = '.logo-marquee__animation-container';

/** IX2 group 2 duration, in ms. */
export const MARQUEE_DURATION_MS = 25000;

/** Guard attribute so React strict-mode double-mounting cannot stack animations. */
const GUARD_ATTR = 'data-marquee-animated';

export const initCoframeMarquee: EffectInit = (
  root: ParentNode = document,
): Teardown | void => {
  const el = root.querySelector<HTMLElement>(MARQUEE_SELECTOR);
  if (!el) return;

  // Already animated by a previous mount: leave the running animation alone.
  if (el.hasAttribute(GUARD_ATTR)) return;

  // IX2 group 1: the initial state is x = 0%.
  el.style.transform = 'translateX(0%)';

  // Honour reduced motion by simply not scrolling the strip. The logos stay
  // legible in their initial position rather than moving indefinitely.
  if (prefersReducedMotion()) return;

  if (typeof el.animate !== 'function') return;

  el.setAttribute(GUARD_ATTR, 'true');

  const animation = el.animate(
    [{ transform: 'translateX(0%)' }, { transform: 'translateX(-50%)' }],
    {
      duration: MARQUEE_DURATION_MS,
      iterations: Number.POSITIVE_INFINITY,
      easing: 'linear',
    },
  );

  return () => {
    try {
      animation.cancel();
    } catch {
      /* teardown must never throw during unmount */
    }
    el.removeAttribute(GUARD_ATTR);
  };
};
