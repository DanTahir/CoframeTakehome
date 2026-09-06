/**
 * Scroll fade-ins — a faithful port of the captured inline script
 * `scrape/analysis/script-21.js`.
 *
 * Deliberately NOT the template's generic `createFadeIn`, which differs from
 * this site in three ways that are all visible:
 *   1. Selector. Upstream queries `.fade-in` and nothing else. The generic one
 *      also matches `[data-fade]` / `[data-animate]`, which would animate
 *      `div.compare-grid` — an element that carries a bare `data-fade` attribute
 *      but no `.fade-in` class, and which the live site never animates (it
 *      renders at full opacity). Matching the original selector exactly is what
 *      keeps the replica faithful.
 *   2. Threshold. Upstream defaults to 0.4 and reads a per-element override
 *      from `data-fade-threshold`; the generic one uses 0.15 with a rootMargin.
 *   3. Stagger. Upstream sets `style.animationDelay` from a `data-fade-delay`
 *      keyword map; the generic one has an index-based stagger instead.
 *
 * The finished-state class is `faded-in`, confirmed present in the captured
 * CSS (`.fade-in { ... } .faded-in { ... }`).
 */
import { prefersReducedMotion, type EffectInit, type Teardown } from './runtime';

/** Upstream's `delayMapping`, verbatim. */
const DELAY_MAPPING: Record<string, string> = {
  s: '0.4s',
  m: '0.8s',
  l: '1.2s',
  xl: '1.6s',
};

const SELECTOR = '.fade-in';
const ACTIVE_CLASS = 'faded-in';
const DEFAULT_THRESHOLD = 0.4;

export const initCoframeFadeIn: EffectInit = (
  root: ParentNode = document,
): Teardown | void => {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(SELECTOR));
  if (!elements.length) return;

  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    // Reveal everything at once: the class is what makes the content visible,
    // so skipping it entirely would hide real copy.
    for (const el of elements) el.classList.add(ACTIVE_CLASS);
    return;
  }

  const observers: IntersectionObserver[] = [];

  // Upstream declares ONE mutable `observer` variable and reassigns it inside
  // the loop, so every callback closes over the shared binding and
  // `observer.unobserve(...)` ends up addressing whichever observer was created
  // last rather than the one that fired. The practical effect is that most
  // elements are never unobserved and keep re-running the (idempotent) class
  // add. That is upstream's real behaviour and is reproduced here rather than
  // "fixed", since fixing it would change when the delay is re-applied.
  let observer: IntersectionObserver | null = null;

  const createObserver = (threshold = DEFAULT_THRESHOLD) =>
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          const delayKey = target.getAttribute('data-fade-delay');
          const delay = (delayKey ? DELAY_MAPPING[delayKey] : undefined) ?? '0s';
          target.style.animationDelay = delay;
          target.classList.add(ACTIVE_CLASS);
          if (observer === null) return;
          observer.unobserve(entry.target);
        });
      },
      { threshold },
    );

  for (const element of elements) {
    const attr = element.getAttribute('data-fade-threshold');
    const parsed = attr === null ? Number.NaN : Number.parseFloat(attr);
    const threshold = Number.isNaN(parsed) || parsed === 0 ? DEFAULT_THRESHOLD : parsed;
    observer = createObserver(threshold);
    observers.push(observer);
    observer.observe(element);
  }

  return () => {
    for (const o of observers) o.disconnect();
    observer = null;
  };
};
