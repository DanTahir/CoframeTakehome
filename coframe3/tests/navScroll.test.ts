import { beforeEach, describe, expect, it } from 'vitest';
import {
  collectNavDarkenTargets,
  initNavScroll,
  NAV_SCROLL_THRESHOLD,
} from '../app/lib/navScroll';

/**
 * Mirrors the real homepage markup, which matters here: `.nav` is a *div*, and
 * the only actual <nav> tag is the inner `.nav__menu`. The original script
 * darkens `querySelector('nav')` — the first nav *tag* — so `div.nav` itself
 * is deliberately never darkened. A fixture using <nav class="nav"> would pass
 * for the wrong reason.
 */
function renderNav(): void {
  document.body.innerHTML = `
    <div class="nav-wrap">
      <div class="nav w-nav" data-nav-theme="transparent" data-collapse="medium">
        <img class="nav__logo" />
        <aside class="nav__dropdown-toggle nav__link cc-hover-fade"></aside>
        <aside class="nav__dropdown-toggle nav__link cc-hover-fade"></aside>
        <nav class="nav__menu w-nav-menu">
          <a class="nav__link cc-dropdown"></a>
          <a class="nav__link cc-hover-fade w-nav-link"></a>
        </nav>
        <div class="w-nav-button"><img class="nav__menu-button__image" /></div>
      </div>
    </div>
    <div class="nav-dropdown"></div>
    <div class="nav-dropdown"></div>
    <a class="cta-invisible cc-hero"></a>
  `;
}

function setScrollY(value: number): void {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true });
}

const navTag = () => document.querySelector<HTMLElement>('nav')!;
const divNav = () => document.querySelector<HTMLElement>('.nav')!;

describe('collectNavDarkenTargets', () => {
  beforeEach(renderNav);

  it('collects every element the original darkened, without duplicates', () => {
    const targets = collectNavDarkenTargets();

    expect(new Set(targets).size).toBe(targets.length);
    expect(targets).toContain(document.querySelector('.nav-wrap'));
    expect(targets).toContain(document.querySelector('.nav__logo'));
    expect(targets).toContain(document.querySelector('.cta-invisible.cc-hero'));
    expect(targets).toContain(document.querySelector('.nav__menu-button__image'));
  });

  it('includes every repeated toggle, link and dropdown', () => {
    const targets = collectNavDarkenTargets();

    // 2 dropdown toggles, which also carry .nav__link, plus 2 menu links.
    expect(targets.filter((el) => el.classList.contains('nav__link'))).toHaveLength(4);
    expect(targets.filter((el) => el.classList.contains('nav-dropdown'))).toHaveLength(2);
  });

  it('targets the nav tag rather than div.nav, matching the original', () => {
    const targets = collectNavDarkenTargets();

    expect(targets).toContain(navTag());
    expect(targets).not.toContain(divNav());
  });
});

describe('initNavScroll', () => {
  beforeEach(() => {
    renderNav();
    setScrollY(0);
  });

  it('leaves the nav transparent at the top of the page', () => {
    initNavScroll();
    expect(document.querySelectorAll('.cc-dark')).toHaveLength(0);
  });

  it('darkens the nav once scrolled past the threshold', () => {
    initNavScroll();

    setScrollY(NAV_SCROLL_THRESHOLD + 1);
    window.dispatchEvent(new Event('scroll'));

    for (const selector of [
      '.nav-wrap',
      '.nav__logo',
      '.nav-dropdown',
      '.nav__menu-button__image',
      '.cta-invisible.cc-hero',
    ]) {
      expect(document.querySelector(selector)!.classList.contains('cc-dark'), selector).toBe(true);
    }
    expect(navTag().classList.contains('cc-dark')).toBe(true);
  });

  it('never darkens div.nav itself, only the theme attribute drives it', () => {
    initNavScroll();

    setScrollY(800);
    window.dispatchEvent(new Event('scroll'));

    expect(divNav().classList.contains('cc-dark')).toBe(false);
    expect(divNav().getAttribute('data-nav-theme')).toBe('transparent');
  });

  it('does not darken exactly at the threshold (strict >)', () => {
    initNavScroll();

    setScrollY(NAV_SCROLL_THRESHOLD);
    window.dispatchEvent(new Event('scroll'));

    expect(document.querySelector('.nav-wrap')!.classList.contains('cc-dark')).toBe(false);
  });

  it('undarkens again when scrolled back to the top', () => {
    initNavScroll();

    setScrollY(500);
    window.dispatchEvent(new Event('scroll'));
    expect(document.querySelector('.nav-wrap')!.classList.contains('cc-dark')).toBe(true);

    setScrollY(0);
    window.dispatchEvent(new Event('scroll'));
    expect(document.querySelector('.nav-wrap')!.classList.contains('cc-dark')).toBe(false);
  });

  it('forces the transparent theme and locks scroll while the mobile menu is open', async () => {
    initNavScroll();

    setScrollY(500);
    window.dispatchEvent(new Event('scroll'));
    expect(document.querySelector('.nav-wrap')!.classList.contains('cc-dark')).toBe(true);

    navTag().setAttribute('data-nav-menu-open', '');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(divNav().getAttribute('data-nav-theme')).toBe('transparent');
    expect(document.querySelector('.nav-wrap')!.classList.contains('cc-dark')).toBe(false);
    expect(document.body.style.overflowY).toBe('hidden');
  });

  it('restores scrolling when the mobile menu closes', async () => {
    initNavScroll();

    navTag().setAttribute('data-nav-menu-open', '');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.style.overflowY).toBe('hidden');

    navTag().removeAttribute('data-nav-menu-open');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.style.overflowY).toBe('visible');
  });

  it('always pins overflow-x to hidden, as the original did', () => {
    initNavScroll();
    expect(document.body.style.overflowX).toBe('hidden');
  });

  it('stops responding after teardown', () => {
    const teardown = initNavScroll();
    teardown();

    setScrollY(800);
    window.dispatchEvent(new Event('scroll'));

    expect(document.querySelector('.nav-wrap')!.classList.contains('cc-dark')).toBe(false);
  });
});
