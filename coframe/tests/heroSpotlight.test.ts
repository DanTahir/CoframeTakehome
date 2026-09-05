import { beforeEach, describe, expect, it } from 'vitest';
import { initHeroSpotlight } from '@/app/effects/HeroSpotlight';

describe('hero pointer spotlight', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section class="hero">
        <img class="hero__bg-elements" />
      </section>
    `;

    // jsdom has no layout, so give the hero a deterministic box.
    const hero = document.querySelector<HTMLElement>('.hero')!;
    hero.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 1000, height: 500 }) as DOMRect;
  });

  it('translates pointer position into --x/--y percentages', () => {
    const cleanup = initHeroSpotlight();
    const hero = document.querySelector<HTMLElement>('.hero')!;
    const bg = document.querySelector<HTMLElement>('.hero__bg-elements')!;

    hero.dispatchEvent(new MouseEvent('mousemove', { clientX: 250, clientY: 100 }));

    expect(bg.style.getPropertyValue('--x')).toBe('25%');
    expect(bg.style.getPropertyValue('--y')).toBe('20%');
    expect(bg.style.opacity).toBe('1');

    cleanup();
  });

  it('hides the spotlight when the pointer leaves the hero', () => {
    const cleanup = initHeroSpotlight();
    const hero = document.querySelector<HTMLElement>('.hero')!;
    const bg = document.querySelector<HTMLElement>('.hero__bg-elements')!;

    hero.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 250 }));
    expect(bg.style.opacity).toBe('1');

    hero.dispatchEvent(new MouseEvent('mouseleave'));
    expect(bg.style.opacity).toBe('0');

    cleanup();
  });

  it('hides the spotlight when the pointer leaves the window entirely', () => {
    const cleanup = initHeroSpotlight();
    const hero = document.querySelector<HTMLElement>('.hero')!;
    const bg = document.querySelector<HTMLElement>('.hero__bg-elements')!;

    hero.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 250 }));
    window.dispatchEvent(new MouseEvent('mouseout', { clientY: -5 }));

    expect(bg.style.opacity).toBe('0');
    cleanup();
  });

  it('stops responding after cleanup', () => {
    const cleanup = initHeroSpotlight();
    const hero = document.querySelector<HTMLElement>('.hero')!;
    const bg = document.querySelector<HTMLElement>('.hero__bg-elements')!;
    cleanup();

    hero.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
    expect(bg.style.getPropertyValue('--x')).toBe('');
  });

  it('is a no-op without a hero section', () => {
    document.body.innerHTML = '<div></div>';
    expect(() => initHeroSpotlight()()).not.toThrow();
  });
});
