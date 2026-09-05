import { beforeEach, describe, expect, it } from 'vitest';
import { initHeroSpotlight } from '../app/lib/heroSpotlight';

function renderHero(): void {
  document.body.innerHTML = `
    <section class="hero">
      <div class="hero__bg-elements"></div>
      <div class="hero__inner-container"><h1>Automate website growth</h1></div>
    </section>
  `;

  // jsdom has no layout, so the hero would otherwise be a 0x0 box and the
  // percentage maths would divide by zero.
  const hero = document.querySelector<HTMLElement>('.hero')!;
  hero.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 1000, height: 500, right: 1000, bottom: 500, x: 0, y: 0 }) as DOMRect;
}

const heroBg = () => document.querySelector<HTMLElement>('.hero__bg-elements')!;

function moveMouse(clientX: number, clientY: number): void {
  document
    .querySelector('.hero')!
    .dispatchEvent(new MouseEvent('mousemove', { clientX, clientY, bubbles: true }));
}

describe('initHeroSpotlight', () => {
  beforeEach(renderHero);

  it('writes the pointer position into --x / --y as percentages', () => {
    initHeroSpotlight();

    moveMouse(250, 100);

    expect(heroBg().style.getPropertyValue('--x')).toBe('25%');
    expect(heroBg().style.getPropertyValue('--y')).toBe('20%');
  });

  it('fades the spotlight layer in on movement', () => {
    initHeroSpotlight();

    expect(heroBg().style.opacity).toBe('');
    moveMouse(500, 250);

    expect(heroBg().style.opacity).toBe('1');
  });

  it('tracks the pointer across successive moves', () => {
    initHeroSpotlight();

    moveMouse(0, 0);
    expect(heroBg().style.getPropertyValue('--x')).toBe('0%');

    moveMouse(1000, 500);
    expect(heroBg().style.getPropertyValue('--x')).toBe('100%');
    expect(heroBg().style.getPropertyValue('--y')).toBe('100%');
  });

  it('fades out when the pointer leaves the hero entirely', () => {
    initHeroSpotlight();
    moveMouse(500, 250);

    document
      .querySelector('.hero')!
      .dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: document.body }));

    expect(heroBg().style.opacity).toBe('0');
  });

  it('stays visible when the pointer moves onto a child of the hero', () => {
    initHeroSpotlight();
    moveMouse(500, 250);

    const child = document.querySelector('.hero__inner-container')!;
    document
      .querySelector('.hero')!
      .dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: child }));

    expect(heroBg().style.opacity).toBe('1');
  });

  it('fades out when the cursor exits the window past the top edge', () => {
    initHeroSpotlight();
    moveMouse(500, 250);

    window.dispatchEvent(new MouseEvent('mouseout', { clientY: -5, relatedTarget: null }));

    expect(heroBg().style.opacity).toBe('0');
  });

  it('ignores a window mouseout that is not past the top edge', () => {
    initHeroSpotlight();
    moveMouse(500, 250);

    window.dispatchEvent(new MouseEvent('mouseout', { clientY: 300, relatedTarget: null }));

    expect(heroBg().style.opacity).toBe('1');
  });

  it('does nothing when the hero has no layout yet', () => {
    const hero = document.querySelector<HTMLElement>('.hero')!;
    hero.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 }) as DOMRect;

    initHeroSpotlight();
    moveMouse(10, 10);

    expect(heroBg().style.getPropertyValue('--x')).toBe('');
    expect(heroBg().style.opacity).toBe('');
  });

  it('is inert when the hero markup is absent', () => {
    document.body.innerHTML = '';
    expect(() => initHeroSpotlight()()).not.toThrow();
  });

  it('stops tracking after teardown', () => {
    const teardown = initHeroSpotlight();
    teardown();

    moveMouse(500, 250);

    expect(heroBg().style.getPropertyValue('--x')).toBe('');
  });
});
