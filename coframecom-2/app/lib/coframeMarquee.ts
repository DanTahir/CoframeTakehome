/**
 * The logo marquee.
 *
 * This one is NOT a CSS animation and NOT the template's generic clone-based
 * marquee — the captured stylesheets contain no marquee keyframes at all. On
 * the live site it is a Webflow IX2 interaction, and `webflow.js` is stripped
 * by the sanitizer, so it has to be re-driven here.
 *
 * Timings are lifted from the captured IX2 payload rather than invented:
 * action list `"a"` ("Logo Animation") on target
 * `674d6aa7-c193-2fe4-61dd-3519f496b39e` is three TRANSFORM_MOVE groups with
 * `useFirstGroupAsInitialState`:
 *
 *   | group | xValue | duration | meaning              |
 *   |-------|--------|----------|----------------------|
 *   | 1     | 0%     | 500      | initial state        |
 *   | 2     | -50%   | 25000    | the scroll           |
 *   | 3     | 0%     | 0        | instant loop restart |
 *
 * The captured markup already contains TWO copies of the logo set, so
 * translating by exactly -50% lands copy 2 where copy 1 began and the restart
 * is invisible. Nothing may be cloned here: the generic marquee effect would
 * append a third set and desynchronise that -50% wrap.
 */
import { $all, prefersReducedMotion, type Teardown } from './runtime';

const MARQUEE_SELECTOR = '.logo-marquee__animation-container';
export const MARQUEE_DURATION_MS = 25000;
export const MARQUEE_TRANSLATE_TO = '-50%';

export function initCoframeMarquee(root: ParentNode = document): Teardown | void {
  const tracks = $all<HTMLElement>(MARQUEE_SELECTOR, root);
  if (!tracks.length) return;

  // Honour reduced motion by simply leaving the strip at its initial state.
  if (prefersReducedMotion()) return;

  const animations: Animation[] = [];

  for (const track of tracks) {
    // Idempotency guard: React strict mode mounts effects twice in dev, and a
    // second Animation on the same element would double the apparent speed.
    if (track.dataset.marqueeAnimated === 'true') continue;

    if (typeof track.animate !== 'function') continue;

    const animation = track.animate(
      [
        { transform: 'translate3d(0%, 0px, 0px)' },
        { transform: `translate3d(${MARQUEE_TRANSLATE_TO}, 0px, 0px)` },
      ],
      { duration: MARQUEE_DURATION_MS, iterations: Infinity, easing: 'linear' },
    );

    track.dataset.marqueeAnimated = 'true';
    animations.push(animation);
  }

  return () => {
    for (const animation of animations) {
      try {
        animation.cancel();
      } catch {
        /* teardown must never throw during unmount */
      }
    }
    for (const track of tracks) delete track.dataset.marqueeAnimated;
  };
}
