// Nav behaviours: dark theme on scroll, mobile-menu handling, dropdowns, and the
// hero cursor spotlight.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getAnimationDuration, initNavDropdowns } from '../app/lib/navDropdowns';
import { SCROLL_THRESHOLD, initNavScroll } from '../app/lib/navScroll';
import { initHeroSpotlight } from '../app/lib/heroSpotlight';
import { mountBody, unmountBody } from './helpers';

/**
 * The elements initNavScroll actually darkens.
 *
 * The page also ships 8 statically-authored `.cc-dark` elements (in the compare
 * grid and a bordered grid) that have nothing to do with the nav and are present
 * regardless of scroll position, so a document-wide `.cc-dark` count would never
 * be 0 and would not measure this behaviour.
 */
const NAV_DARKEN_SELECTOR = [
  'nav',
  '.nav-wrap',
  '.nav__logo',
  '.nav__dropdown-toggle',
  '.nav__link',
  '.nav-dropdown',
  '.cta-invisible.cc-hero',
  '.nav__menu-button__image',
]
  .map((s) => `${s}.cc-dark`)
  .join(', ');

function navDarkCount(): number {
  return document.querySelectorAll(NAV_DARKEN_SELECTOR).length;
}

/** jsdom's window.scrollY is a read-only getter, so redefine it. */
function setScrollY(value: number): void {
  Object.defineProperty(window, 'scrollY', {
    value,
    writable: true,
    configurable: true,
  });
}

describe('nav dark theme on scroll', () => {
  beforeEach(() => {
    mountBody();
    setScrollY(0);
  });

  afterEach(() => {
    unmountBody();
    setScrollY(0);
  });

  it('finds the nav and mobile menu in the ported markup', () => {
    expect(document.querySelector('.nav')).not.toBeNull();
    expect(document.querySelector('.w-nav-menu')).not.toBeNull();
  });

  it('starts undarkened at the top of the page', () => {
    const cleanup = initNavScroll(document);
    expect(navDarkCount()).toBe(0);
    cleanup();
  });

  it('darkens the nav past the scroll threshold', () => {
    const cleanup = initNavScroll(document);

    setScrollY(SCROLL_THRESHOLD + 1);
    window.dispatchEvent(new Event('scroll'));

    expect(navDarkCount()).toBeGreaterThan(0);

    // The original inline script uses two *different* elements: `.nav` (a
    // div.nav.w-nav) only ever carries data-nav-theme, while the darken list
    // starts at `document.querySelector('nav')` - which on this page is the
    // inner <nav class="nav__menu w-nav-menu">. So `.nav` itself is never
    // given .cc-dark, and asserting that it is would test a behaviour the real
    // site does not have.
    const navTag = document.querySelector('nav') as HTMLElement;
    expect(navTag.classList.contains('nav__menu')).toBe(true);
    expect(navTag.classList.contains('cc-dark')).toBe(true);
    expect(document.querySelector('.nav')?.classList.contains('cc-dark')).toBe(false);

    cleanup();
  });

  it('does not darken exactly at the threshold (strictly greater)', () => {
    const cleanup = initNavScroll(document);

    setScrollY(SCROLL_THRESHOLD);
    window.dispatchEvent(new Event('scroll'));

    expect(navDarkCount()).toBe(0);
    cleanup();
  });

  it('undarkens again when scrolled back to the top', () => {
    const cleanup = initNavScroll(document);

    setScrollY(500);
    window.dispatchEvent(new Event('scroll'));
    expect(navDarkCount()).toBeGreaterThan(0);

    setScrollY(0);
    window.dispatchEvent(new Event('scroll'));
    expect(navDarkCount()).toBe(0);

    cleanup();
  });

  it('darkens the nav logo and links, not just the bar', () => {
    const cleanup = initNavScroll(document);

    setScrollY(200);
    window.dispatchEvent(new Event('scroll'));

    expect(document.querySelector('.nav__logo')?.classList.contains('cc-dark')).toBe(true);
    expect(document.querySelector('.nav__link')?.classList.contains('cc-dark')).toBe(true);

    cleanup();
  });

  it('locks body scrolling and forces the transparent theme while the menu is open', async () => {
    const cleanup = initNavScroll(document);
    const menu = document.querySelector('.w-nav-menu') as HTMLElement;

    setScrollY(500);
    window.dispatchEvent(new Event('scroll'));

    menu.setAttribute('data-nav-menu-open', '');
    // MutationObserver callbacks are microtask-scheduled.
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    expect(document.body.style.overflowY).toBe('hidden');
    expect(document.querySelector('.nav')?.getAttribute('data-nav-theme')).toBe('transparent');
    expect(navDarkCount()).toBe(0);

    cleanup();
  });

  it('restores scrolling when the menu closes', async () => {
    const cleanup = initNavScroll(document);
    const menu = document.querySelector('.w-nav-menu') as HTMLElement;

    menu.setAttribute('data-nav-menu-open', '');
    await new Promise((r) => setTimeout(r, 0));
    menu.removeAttribute('data-nav-menu-open');
    await new Promise((r) => setTimeout(r, 0));

    expect(document.body.style.overflowY).toBe('visible');
    cleanup();
  });

  it('stops responding after cleanup', () => {
    const cleanup = initNavScroll(document);
    cleanup();

    setScrollY(800);
    window.dispatchEvent(new Event('scroll'));

    expect(navDarkCount()).toBe(0);
  });

  it('leaves the statically-dark compare-grid elements alone', () => {
    // Guards the scoping above: these 8 are authored dark in the source markup and
    // must not be touched by the scroll handler in either direction.
    const staticDark = () =>
      document.querySelectorAll(
        '.bordered-grid__container.cc-dark, .compare-grid__header-cell.cc-dark,' +
          ' .compare-grid__horizontal-separator.cc-dark',
      ).length;

    const before = staticDark();
    expect(before).toBe(8);

    const cleanup = initNavScroll(document);
    setScrollY(500);
    window.dispatchEvent(new Event('scroll'));
    expect(staticDark()).toBe(before);

    setScrollY(0);
    window.dispatchEvent(new Event('scroll'));
    expect(staticDark()).toBe(before);

    cleanup();
  });

  it('is a no-op without a nav', () => {
    const empty = document.createElement('div');
    expect(() => initNavScroll(empty)()).not.toThrow();
  });
});

describe('nav dropdowns', () => {
  beforeEach(() => mountBody());
  afterEach(() => unmountBody());

  it('finds dropdown toggles paired with dropdowns by id', () => {
    const toggles = document.querySelectorAll('.nav__dropdown-toggle');
    expect(toggles.length).toBeGreaterThan(0);

    let paired = 0;
    toggles.forEach((toggle) => {
      const id = toggle.getAttribute('id');
      if (id && document.querySelector(`.nav-dropdown[id="${id}"]`)) paired += 1;
    });
    expect(paired).toBe(toggles.length);
  });

  it('opens a dropdown on hover and blurs the page behind it', async () => {
    const cleanup = initNavDropdowns(document);
    const toggle = document.querySelector('.nav__dropdown-toggle') as HTMLElement;
    const dropdown = document.querySelector(
      `.nav-dropdown[id="${toggle.getAttribute('id')}"]`,
    ) as HTMLElement;

    toggle.dispatchEvent(new MouseEvent('mouseenter'));
    await Promise.resolve();

    expect(dropdown.classList.contains('visible')).toBe(true);
    expect(toggle.classList.contains('active')).toBe(true);

    const nav = document.querySelector('.nav') as HTMLElement;
    expect(nav.style.borderColor).toBe('transparent');

    cleanup();
  });

  it('closes the dropdown again on mouseleave', async () => {
    const cleanup = initNavDropdowns(document);
    const toggle = document.querySelector('.nav__dropdown-toggle') as HTMLElement;
    const dropdown = document.querySelector(
      `.nav-dropdown[id="${toggle.getAttribute('id')}"]`,
    ) as HTMLElement;

    toggle.dispatchEvent(new MouseEvent('mouseenter'));
    await Promise.resolve();
    expect(dropdown.classList.contains('visible')).toBe(true);

    toggle.dispatchEvent(new MouseEvent('mouseleave'));
    // hideDropdown awaits the CSS animation duration before finishing.
    await new Promise((r) => setTimeout(r, 20));

    expect(dropdown.classList.contains('visible')).toBe(false);
    expect(toggle.classList.contains('active')).toBe(false);

    cleanup();
  });

  it('closes any open dropdown on resize', async () => {
    const cleanup = initNavDropdowns(document);
    const toggle = document.querySelector('.nav__dropdown-toggle') as HTMLElement;
    const dropdown = document.querySelector(
      `.nav-dropdown[id="${toggle.getAttribute('id')}"]`,
    ) as HTMLElement;

    toggle.dispatchEvent(new MouseEvent('mouseenter'));
    await Promise.resolve();

    window.dispatchEvent(new Event('resize'));
    expect(dropdown.classList.contains('visible')).toBe(false);

    cleanup();
  });

  it('reads a numeric animation duration from computed style', () => {
    const node = document.createElement('div');
    document.body.appendChild(node);
    expect(Number.isFinite(getAnimationDuration(node))).toBe(true);
    node.remove();
  });

  it('detaches hover handlers on cleanup', async () => {
    const cleanup = initNavDropdowns(document);
    cleanup();

    const toggle = document.querySelector('.nav__dropdown-toggle') as HTMLElement;
    const dropdown = document.querySelector(
      `.nav-dropdown[id="${toggle.getAttribute('id')}"]`,
    ) as HTMLElement;

    toggle.dispatchEvent(new MouseEvent('mouseenter'));
    await Promise.resolve();

    expect(dropdown.classList.contains('visible')).toBe(false);
  });
});

describe('hero cursor spotlight', () => {
  beforeEach(() => mountBody());
  afterEach(() => unmountBody());

  it('finds the hero and its spotlight layer', () => {
    expect(document.querySelector('.hero')).not.toBeNull();
    expect(document.querySelector('.hero__bg-elements')).toBeInstanceOf(HTMLElement);
  });

  it('tracks the pointer into --x / --y and fades the layer in', () => {
    const cleanup = initHeroSpotlight(document);
    const hero = document.querySelector('.hero') as HTMLElement;
    const bg = document.querySelector('.hero__bg-elements') as HTMLElement;

    hero.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 50 }));

    expect(bg.style.opacity).toBe('1');
    expect(bg.style.getPropertyValue('--x')).toMatch(/%$/);
    expect(bg.style.getPropertyValue('--y')).toMatch(/%$/);

    cleanup();
  });

  it('fades the layer back out when the pointer leaves the hero', () => {
    const cleanup = initHeroSpotlight(document);
    const hero = document.querySelector('.hero') as HTMLElement;
    const bg = document.querySelector('.hero__bg-elements') as HTMLElement;

    hero.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }));
    expect(bg.style.opacity).toBe('1');

    hero.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: null }));
    expect(bg.style.opacity).toBe('0');

    cleanup();
  });

  it('fades out when the pointer exits the top of the window', () => {
    const cleanup = initHeroSpotlight(document);
    const hero = document.querySelector('.hero') as HTMLElement;
    const bg = document.querySelector('.hero__bg-elements') as HTMLElement;

    hero.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }));
    window.dispatchEvent(new MouseEvent('mouseout', { relatedTarget: null, clientY: 0 }));

    expect(bg.style.opacity).toBe('0');
    cleanup();
  });

  it('stops tracking after cleanup', () => {
    const cleanup = initHeroSpotlight(document);
    const hero = document.querySelector('.hero') as HTMLElement;
    const bg = document.querySelector('.hero__bg-elements') as HTMLElement;

    cleanup();
    bg.style.opacity = '';
    hero.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }));

    expect(bg.style.opacity).toBe('');
  });

  it('is a no-op without a hero', () => {
    const empty = document.createElement('div');
    expect(() => initHeroSpotlight(empty)()).not.toThrow();
  });
});
