// Scroll-triggered fade-ins.
// Ported from the page's inline fade-animation-script: an IntersectionObserver per
// .fade-in element, adding .faded-in with a delay taken from data-fade-delay.

export const FADE_DELAY_MAPPING: Record<string, string> = {
  s: '0.4s',
  m: '0.8s',
  l: '1.2s',
  xl: '1.6s',
};

export const DEFAULT_FADE_THRESHOLD = 0.4;

/** Resolves the animation-delay for a fade-in element. */
export function fadeDelayFor(el: Element): string {
  const key = el.getAttribute('data-fade-delay');
  return (key && FADE_DELAY_MAPPING[key]) || '0s';
}

/** Resolves the observer threshold for a fade-in element. */
export function fadeThresholdFor(el: Element): number {
  const raw = parseFloat(el.getAttribute('data-fade-threshold') ?? '');
  return Number.isFinite(raw) && raw !== 0 ? raw : DEFAULT_FADE_THRESHOLD;
}

/** Applies the faded-in state to a single element. */
export function applyFadeIn(el: Element): void {
  if (el instanceof HTMLElement) el.style.animationDelay = fadeDelayFor(el);
  el.classList.add('faded-in');
}

export function initFadeIn(root: ParentNode = document): () => void {
  const elements = Array.from(root.querySelectorAll('.fade-in'));
  const observers: IntersectionObserver[] = [];

  for (const element of elements) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          applyFadeIn(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { threshold: fadeThresholdFor(element) },
    );
    observer.observe(element);
    observers.push(observer);
  }

  return () => observers.forEach((o) => o.disconnect());
}
