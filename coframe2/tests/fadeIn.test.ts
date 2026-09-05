// Scroll-triggered fade-in behaviour, driven through the fake
// IntersectionObserver from tests/setup.ts.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_FADE_THRESHOLD,
  FADE_DELAY_MAPPING,
  applyFadeIn,
  fadeDelayFor,
  fadeThresholdFor,
  initFadeIn,
} from '../app/lib/fadeIn';
import { mountBody, unmountBody } from './helpers';
import { resetObservers, triggerIntersection } from './setup';

function el(attrs: Record<string, string> = {}): HTMLElement {
  const node = document.createElement('div');
  node.className = 'fade-in';
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

describe('fade-in delay + threshold resolution', () => {
  it('maps every documented delay key to the original duration', () => {
    expect(FADE_DELAY_MAPPING).toEqual({ s: '0.4s', m: '0.8s', l: '1.2s', xl: '1.6s' });
    for (const [key, expected] of Object.entries(FADE_DELAY_MAPPING)) {
      expect(fadeDelayFor(el({ 'data-fade-delay': key }))).toBe(expected);
    }
  });

  it('falls back to 0s for a missing or unknown delay key', () => {
    expect(fadeDelayFor(el())).toBe('0s');
    expect(fadeDelayFor(el({ 'data-fade-delay': 'nonsense' }))).toBe('0s');
  });

  it('reads a custom threshold and defaults otherwise', () => {
    expect(fadeThresholdFor(el({ 'data-fade-threshold': '0.9' }))).toBe(0.9);
    expect(fadeThresholdFor(el())).toBe(DEFAULT_FADE_THRESHOLD);
    // 0 is falsy in the original script and also falls back.
    expect(fadeThresholdFor(el({ 'data-fade-threshold': '0' }))).toBe(DEFAULT_FADE_THRESHOLD);
    expect(fadeThresholdFor(el({ 'data-fade-threshold': 'abc' }))).toBe(DEFAULT_FADE_THRESHOLD);
  });

  it('applies the faded-in class and the animation delay together', () => {
    const node = el({ 'data-fade-delay': 'l' });
    applyFadeIn(node);
    expect(node.classList.contains('faded-in')).toBe(true);
    expect(node.style.animationDelay).toBe('1.2s');
  });
});

describe('fade-in on the real page markup', () => {
  beforeEach(() => {
    resetObservers();
    mountBody();
  });

  afterEach(() => {
    unmountBody();
    resetObservers();
  });

  it('observes every .fade-in element on the page', () => {
    const count = document.querySelectorAll('.fade-in').length;
    expect(count).toBeGreaterThan(30);

    const cleanup = initFadeIn(document);
    // One observer per element, matching the original script.
    expect(globalThis.__intersectionObservers.length).toBe(count);
    cleanup();
  });

  it('starts with nothing faded in', () => {
    initFadeIn(document);
    expect(document.querySelectorAll('.faded-in').length).toBe(0);
  });

  it('fades an element in only once it intersects', () => {
    const cleanup = initFadeIn(document);
    const target = document.querySelector('.fade-in') as HTMLElement;

    expect(target.classList.contains('faded-in')).toBe(false);
    expect(triggerIntersection(target, true)).toBe(true);
    expect(target.classList.contains('faded-in')).toBe(true);

    cleanup();
  });

  it('does not fade in on a non-intersecting entry', () => {
    const cleanup = initFadeIn(document);
    const target = document.querySelector('.fade-in') as HTMLElement;

    triggerIntersection(target, false);
    expect(target.classList.contains('faded-in')).toBe(false);

    cleanup();
  });

  it('unobserves after firing so it never re-triggers', () => {
    const cleanup = initFadeIn(document);
    const target = document.querySelector('.fade-in') as HTMLElement;

    triggerIntersection(target, true);
    // Now unobserved, so no observer still holds the target.
    expect(triggerIntersection(target, true)).toBe(false);

    cleanup();
  });

  it('disconnects every observer on cleanup', () => {
    const cleanup = initFadeIn(document);
    cleanup();
    expect(globalThis.__intersectionObservers.every((r) => r.disconnected)).toBe(true);
  });

  it('passes each element its own threshold to the observer', () => {
    const cleanup = initFadeIn(document);
    const thresholds = new Set(
      globalThis.__intersectionObservers.map((r) => r.options?.threshold),
    );
    // Every observer gets an explicit numeric threshold.
    expect([...thresholds].every((t) => typeof t === 'number')).toBe(true);
    cleanup();
  });
});
