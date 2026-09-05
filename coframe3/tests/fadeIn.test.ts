import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FADE_THRESHOLD,
  FADE_DELAY_MAP,
  initFadeIn,
  resolveFadeDelay,
  resolveFadeThreshold,
} from '../app/lib/fadeIn';
import { observerFor } from './setup';

describe('fade-in delay mapping', () => {
  it('maps each authored size token to the original delay', () => {
    expect(FADE_DELAY_MAP).toEqual({ s: '0.4s', m: '0.8s', l: '1.2s', xl: '1.6s' });
  });

  it('falls back to no delay for a missing or unknown token', () => {
    expect(resolveFadeDelay(null)).toBe('0s');
    expect(resolveFadeDelay('nonsense')).toBe('0s');
    expect(resolveFadeDelay('xl')).toBe('1.6s');
  });
});

describe('fade-in threshold parsing', () => {
  it('defaults to 0.4 when absent or unparseable, matching `|| 0.4`', () => {
    expect(resolveFadeThreshold(null)).toBe(DEFAULT_FADE_THRESHOLD);
    expect(resolveFadeThreshold('')).toBe(DEFAULT_FADE_THRESHOLD);
    expect(resolveFadeThreshold('abc')).toBe(DEFAULT_FADE_THRESHOLD);
    // 0 is falsy in the original, so it also falls back.
    expect(resolveFadeThreshold('0')).toBe(DEFAULT_FADE_THRESHOLD);
  });

  it('honours an explicit threshold', () => {
    expect(resolveFadeThreshold('0.9')).toBeCloseTo(0.9);
  });
});

describe('initFadeIn', () => {
  it('adds `faded-in` with the mapped delay once the element intersects', () => {
    document.body.innerHTML = `
      <div class="fade-in" data-fade-delay="m" data-fade-threshold="0.5"></div>
    `;
    const element = document.querySelector<HTMLElement>('.fade-in')!;

    initFadeIn();

    // Nothing happens until it scrolls into view.
    expect(element.classList.contains('faded-in')).toBe(false);

    const observer = observerFor(element);
    expect(observer).toBeDefined();
    expect(observer!.options?.threshold).toBeCloseTo(0.5);

    observer!.trigger(element);

    expect(element.classList.contains('faded-in')).toBe(true);
    expect(element.style.animationDelay).toBe('0.8s');
  });

  it('does not fade an element that is not intersecting', () => {
    document.body.innerHTML = `<div class="fade-in"></div>`;
    const element = document.querySelector<HTMLElement>('.fade-in')!;

    initFadeIn();
    observerFor(element)!.trigger(element, false);

    expect(element.classList.contains('faded-in')).toBe(false);
  });

  it('gives every fade-in element its own observer', () => {
    document.body.innerHTML = `
      <div class="fade-in" data-fade-delay="s"></div>
      <div class="fade-in" data-fade-delay="l"></div>
      <div class="fade-in"></div>
    `;
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.fade-in'));

    initFadeIn();

    for (const element of elements) {
      expect(observerFor(element)).toBeDefined();
    }

    elements.forEach((el) => observerFor(el)!.trigger(el));

    expect(elements.map((el) => el.style.animationDelay)).toEqual(['0.4s', '1.2s', '0s']);
  });

  it('teardown disconnects every observer', () => {
    document.body.innerHTML = `<div class="fade-in"></div><div class="fade-in"></div>`;
    const teardown = initFadeIn();

    teardown();

    expect(globalThis.__observers.every((o) => o.disconnected)).toBe(true);
  });
});
