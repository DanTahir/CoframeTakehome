'use client';

import { useEffect } from 'react';

/**
 * Reimplementation of the page's `.fade-in` scroll reveal
 * (scrape/scripts/23-fade-animation-script.js).
 *
 * Elements carrying `.fade-in` start at opacity 0 and get `.faded-in` added
 * once they scroll into view, which runs the `fade-in` keyframes. The stagger
 * comes from `data-fade-delay` (s/m/l/xl) and the trigger point from an
 * optional `data-fade-threshold`.
 */
const DELAY_MAPPING: Record<string, string> = {
  s: '0.4s',
  m: '0.8s',
  l: '1.2s',
  xl: '1.6s',
};

const DEFAULT_THRESHOLD = 0.4;

export function useFadeIn(): void {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.fade-in'));
    if (elements.length === 0) return;

    // Without IntersectionObserver (or with reduced motion) just show content.
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof IntersectionObserver === 'undefined' || reduceMotion) {
      elements.forEach((el) => el.classList.add('faded-in'));
      return;
    }

    const reveal = (el: HTMLElement) => {
      const delayKey = el.getAttribute('data-fade-delay') ?? '';
      el.style.animationDelay = DELAY_MAPPING[delayKey] ?? '0s';
      el.classList.add('faded-in');
    };

    // The original creates one observer per element so each can carry its own
    // threshold; mirror that, grouping by threshold to keep it cheap.
    const byThreshold = new Map<number, HTMLElement[]>();
    for (const el of elements) {
      const threshold =
        parseFloat(el.getAttribute('data-fade-threshold') ?? '') || DEFAULT_THRESHOLD;
      const bucket = byThreshold.get(threshold);
      if (bucket) bucket.push(el);
      else byThreshold.set(threshold, [el]);
    }

    const observers: IntersectionObserver[] = [];
    for (const [threshold, group] of byThreshold) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            reveal(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        },
        { threshold },
      );
      group.forEach((el) => observer.observe(el));
      observers.push(observer);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, []);
}

export default function FadeInEffects() {
  useFadeIn();
  return null;
}
