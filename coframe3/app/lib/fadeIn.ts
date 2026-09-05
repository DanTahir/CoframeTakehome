/**
 * Scroll fade-in engine.
 *
 * Faithful port of the homepage's inline fade-in script: every `.fade-in`
 * element gets an IntersectionObserver at its own threshold, and on first
 * intersection receives an `animationDelay` derived from `data-fade-delay`
 * plus the `faded-in` class (the CSS keyframes live in embedded.css).
 *
 * Deviation from the original, deliberate: the original reassigned a single
 * shared `observer` variable inside the element loop, so `unobserve` only ever
 * targeted the last observer created and the rest leaked. The visible result is
 * identical (each element still fades exactly once, because the class is only
 * added once and the animation is not re-triggered), so this port keeps one
 * observer per element and unobserves correctly.
 */

/** `data-fade-delay` token -> CSS animation-delay. */
export const FADE_DELAY_MAP: Readonly<Record<string, string>> = {
  s: '0.4s',
  m: '0.8s',
  l: '1.2s',
  xl: '1.6s',
};

export const DEFAULT_FADE_THRESHOLD = 0.4;

export function resolveFadeDelay(key: string | null): string {
  if (!key) return '0s';
  return FADE_DELAY_MAP[key] ?? '0s';
}

export function resolveFadeThreshold(raw: string | null): number {
  const parsed = Number.parseFloat(raw ?? '');
  // NaN and 0 both fall back, matching the original `|| 0.4`.
  return parsed || DEFAULT_FADE_THRESHOLD;
}

export function initFadeIn(root: ParentNode = document): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};

  const elements = Array.from(root.querySelectorAll<HTMLElement>('.fade-in'));
  const observers: IntersectionObserver[] = [];

  for (const element of elements) {
    const threshold = resolveFadeThreshold(element.getAttribute('data-fade-threshold'));

    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          target.style.animationDelay = resolveFadeDelay(target.getAttribute('data-fade-delay'));
          target.classList.add('faded-in');
          obs.unobserve(target);
        }
      },
      { threshold },
    );

    observer.observe(element);
    observers.push(observer);
  }

  return () => {
    for (const observer of observers) observer.disconnect();
  };
}
