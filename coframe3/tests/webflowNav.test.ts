import { beforeEach, describe, expect, it } from 'vitest';
import {
  collapseWidthFor,
  initWebflowNav,
  NAV_COLLAPSE_BREAKPOINTS,
} from '../app/lib/webflowNav';

function renderNav(collapse = 'medium'): void {
  document.body.innerHTML = `
    <nav class="nav w-nav" data-collapse="${collapse}" data-animation="over-left">
      <nav class="nav__menu w-nav-menu"><a href="https://www.coframe.com/blog">Blog</a></nav>
      <div class="w-nav-button"></div>
    </nav>
  `;
}

function setInnerWidth(value: number): void {
  Object.defineProperty(window, 'innerWidth', { value, configurable: true, writable: true });
}

describe('collapseWidthFor', () => {
  it('maps Webflow collapse tokens to their breakpoints', () => {
    expect(collapseWidthFor('small')).toBe(NAV_COLLAPSE_BREAKPOINTS.small);
    expect(collapseWidthFor('medium')).toBe(NAV_COLLAPSE_BREAKPOINTS.medium);
    expect(collapseWidthFor('all')).toBe(Number.POSITIVE_INFINITY);
    expect(collapseWidthFor(null)).toBe(NAV_COLLAPSE_BREAKPOINTS.large);
  });
});

describe('initWebflowNav', () => {
  beforeEach(() => {
    renderNav();
    setInnerWidth(390);
  });

  it('creates the overlay Webflow\'s CSS expects', () => {
    initWebflowNav();
    expect(document.querySelector('.w-nav-overlay')).not.toBeNull();
  });

  it('opens the drawer with the attribute the CSS and nav script key off', () => {
    initWebflowNav();

    document.querySelector<HTMLElement>('.w-nav-button')!.click();

    const menu = document.querySelector<HTMLElement>('.w-nav-menu')!;
    expect(menu.hasAttribute('data-nav-menu-open')).toBe(true);
    expect(document.querySelector('.w-nav-button')!.classList.contains('w--open')).toBe(true);
    // The menu is moved into the overlay, as Webflow does.
    expect(menu.closest('.w-nav-overlay')).not.toBeNull();
  });

  it('closes again on a second tap and restores the menu to its authored slot', () => {
    initWebflowNav();
    const button = document.querySelector<HTMLElement>('.w-nav-button')!;
    const nav = document.querySelector<HTMLElement>('.nav')!;

    button.click();
    button.click();

    const menu = document.querySelector<HTMLElement>('.w-nav-menu')!;
    expect(menu.hasAttribute('data-nav-menu-open')).toBe(false);
    expect(button.classList.contains('w--open')).toBe(false);
    expect(menu.parentElement).toBe(nav);
  });

  it('closes when a nav link is followed', () => {
    initWebflowNav();
    document.querySelector<HTMLElement>('.w-nav-button')!.click();

    document.querySelector<HTMLAnchorElement>('.w-nav-menu a')!.click();

    expect(document.querySelector('.w-nav-menu')!.hasAttribute('data-nav-menu-open')).toBe(false);
  });

  it('closes on Escape', () => {
    initWebflowNav();
    document.querySelector<HTMLElement>('.w-nav-button')!.click();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(document.querySelector('.w-nav-menu')!.hasAttribute('data-nav-menu-open')).toBe(false);
  });

  it('closes when the viewport grows past the collapse breakpoint', () => {
    initWebflowNav();
    document.querySelector<HTMLElement>('.w-nav-button')!.click();

    setInnerWidth(1280);
    window.dispatchEvent(new Event('resize'));

    expect(document.querySelector('.w-nav-menu')!.hasAttribute('data-nav-menu-open')).toBe(false);
  });

  it('teardown closes the drawer and unbinds', () => {
    const teardown = initWebflowNav();
    const button = document.querySelector<HTMLElement>('.w-nav-button')!;

    button.click();
    teardown();

    expect(document.querySelector('.w-nav-menu')!.hasAttribute('data-nav-menu-open')).toBe(false);

    button.click();
    expect(document.querySelector('.w-nav-menu')!.hasAttribute('data-nav-menu-open')).toBe(false);
  });
});
