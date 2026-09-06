/**
 * Scroll-triggered fade-in (faithful port of the site's inline fade-in script).
 *
 * Each `.fade-in` element gets its OWN IntersectionObserver, because the
 * original script reassigns a single `observer` variable inside the per-element
 * loop -- so the threshold from `data-fade-threshold` is honoured per element
 * rather than the last one winning. Reproducing that shape keeps the reveal
 * timing identical to the live page.
 *
 * The finished state is the `.faded-in` class; the animation delay comes from
 * `data-fade-delay` mapped through the site's s/m/l/xl scale.
 */
import { $all, prefersReducedMotion, type Teardown } from './runtime';

const DELAY_MAPPING: Record<string, string> = {
  s: '0.4s',
  m: '0.8s',
  l: '1.2s',
  xl: '1.6s',
};

const DEFAULT_THRESHOLD = 0.4;

export function initCoframeFadeIn(root: ParentNode = document): Teardown | void {
  const elements = $all<HTMLElement>('.fade-in', root);
  if (!elements.length) return;

  // No IntersectionObserver (or the visitor asked for less motion): show
  // everything immediately rather than leaving the page blank.
  if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
    for (const el of elements) {
      el.style.animationDelay = '0s';
      el.classList.add('faded-in');
    }
    return;
  }

  const observers: IntersectionObserver[] = [];

  for (const element of elements) {
    const threshold =
      Number.parseFloat(element.getAttribute('data-fade-threshold') ?? '') || DEFAULT_THRESHOLD;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          const delayKey = target.getAttribute('data-fade-delay') ?? '';
          target.style.animationDelay = DELAY_MAPPING[delayKey] ?? '0s';
          target.classList.add('faded-in');
          observer.unobserve(target);
        }
      },
      { threshold },
    );

    observer.observe(element);
    observers.push(observer);
  }

  return () => observers.forEach((o) => o.disconnect());
}
