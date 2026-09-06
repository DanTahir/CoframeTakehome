/**
 * Scroll-triggered entrance animations, ported from the site's own script
 * (captured as `scrape/analysis/script-21.js`).
 *
 * The captured CSS ships `.fade-in` at `opacity: 0` and runs the `fade-in`
 * keyframe once the `faded-in` class lands, so this module is what makes 47
 * elements visible at all. Details that matter and are NOT the generic
 * template defaults:
 *
 *  - selector is exactly `.fade-in` (the site's script queries only that, so a
 *    broader selector would animate elements upstream never touches);
 *  - the finished-state class is `faded-in`;
 *  - the trigger threshold is per-element via `data-fade-threshold`, default
 *    0.4 (not the template's 0.15) and there is no rootMargin offset;
 *  - `data-fade-delay` maps to a stagger written onto `animationDelay`.
 */
import { $all, prefersReducedMotion, type Teardown } from './runtime';

/** Upstream's delay buckets, verbatim. */
const DELAY_MAPPING: Record<string, string> = {
  s: '0.4s',
  m: '0.8s',
  l: '1.2s',
  xl: '1.6s',
};

export const FADE_SELECTOR = '.fade-in';
export const FADE_ACTIVE_CLASS = 'faded-in';
const DEFAULT_THRESHOLD = 0.4;

export function initCoframeFadeIn(root: ParentNode = document): Teardown | void {
  const targets = $all<HTMLElement>(FADE_SELECTOR, root);
  if (!targets.length) return;

  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    for (const el of targets) el.classList.add(FADE_ACTIVE_CLASS);
    return;
  }

  // One observer per element. Upstream assigns each element's observer to a
  // single shared `var`, which means its `unobserve` call can target a
  // different observer than the one that fired; adding a class is idempotent
  // so the visible result is identical, but per-element observers are what
  // actually honour the per-element `data-fade-threshold` upstream intends.
  const observers: IntersectionObserver[] = [];

  for (const el of targets) {
    const parsed = Number.parseFloat(el.getAttribute('data-fade-threshold') ?? '');
    const threshold = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_THRESHOLD;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          const delayKey = target.getAttribute('data-fade-delay') ?? '';
          target.style.animationDelay = DELAY_MAPPING[delayKey] ?? '0s';
          target.classList.add(FADE_ACTIVE_CLASS);
          observer.unobserve(target);
        }
      },
      { threshold },
    );

    observer.observe(el);
    observers.push(observer);
  }

  return () => {
    for (const observer of observers) observer.disconnect();
  };
}
