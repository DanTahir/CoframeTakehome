import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initNavInteractions } from '@/app/effects/NavInteractions';

/**
 * The dropdown panel is shown by CSS keyed on `.nav__dropdown-toggle.active`
 * (see the extracted `nav-dropdown-script` style embed), so these tests assert
 * the class contract rather than computed styles.
 *
 * Behaviour is ported from scrape/scripts/19-nav-dropdown-script.js: desktop is
 * hover-only, mobile (<=767px) is click-only.
 */
const NAV_HTML = `
  <div class="nav">
    <div class="nav__menu">
      <div class="nav__dropdown-toggle" id="t1">
        <div class="nav-dropdown"><a href="https://www.coframe.com/blog">Blog</a></div>
      </div>
      <div class="nav__dropdown-toggle" id="t2">
        <div class="nav-dropdown"></div>
      </div>
    </div>
    <div class="nav__menu-button"></div>
  </div>
  <div class="hero__inner-container"></div>
  <div class="content"></div>
`;

/** The default setup.ts stub reports `matches: false` for every query. */
function setMobileViewport(isMobile: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: isMobile && query.includes('max-width: 767px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

const toggle1 = () => document.getElementById('t1')!;
const panel1 = () => document.querySelector<HTMLElement>('#t1 .nav-dropdown')!;

describe('nav dropdowns', () => {
  beforeEach(() => {
    document.body.innerHTML = NAV_HTML;
    document.body.className = '';
    setMobileViewport(false);
  });

  afterEach(() => {
    setMobileViewport(false);
  });

  it('opens on hover and closes on leave (desktop)', () => {
    const cleanup = initNavInteractions();
    const toggle = toggle1();

    toggle.dispatchEvent(new MouseEvent('mouseenter'));
    expect(toggle.classList.contains('active')).toBe(true);

    toggle.dispatchEvent(new MouseEvent('mouseleave'));
    expect(toggle.classList.contains('active')).toBe(false);

    cleanup();
  });

  it('marks the nested panel visible on desktop hover', () => {
    const cleanup = initNavInteractions();

    toggle1().dispatchEvent(new MouseEvent('mouseenter'));
    expect(panel1().classList.contains('visible')).toBe(true);
    // `mobile-visible` is the mobile-only variant.
    expect(panel1().classList.contains('mobile-visible')).toBe(false);

    toggle1().dispatchEvent(new MouseEvent('mouseleave'));
    expect(panel1().classList.contains('visible')).toBe(false);

    cleanup();
  });

  it('blurs the page content while a dropdown is open (desktop)', () => {
    const cleanup = initNavInteractions();
    const content = document.querySelector<HTMLElement>('.content')!;
    const hero = document.querySelector<HTMLElement>('.hero__inner-container')!;

    toggle1().dispatchEvent(new MouseEvent('mouseenter'));
    expect(content.classList.contains('blur')).toBe(true);
    expect(hero.classList.contains('blur')).toBe(true);

    toggle1().dispatchEvent(new MouseEvent('mouseleave'));
    expect(content.classList.contains('blur')).toBe(false);
    expect(hero.classList.contains('blur')).toBe(false);

    cleanup();
  });

  it('clears the nav border while a dropdown is open', () => {
    const cleanup = initNavInteractions();
    const nav = document.querySelector<HTMLElement>('.nav')!;

    toggle1().dispatchEvent(new MouseEvent('mouseenter'));
    expect(nav.style.borderColor).toBe('transparent');

    toggle1().dispatchEvent(new MouseEvent('mouseleave'));
    expect(nav.style.borderColor).toBe('');

    cleanup();
  });

  it('does not close on a desktop click, since the original binds click only on mobile', () => {
    // Regression guard: a real mouse click is preceded by mouseenter, so a
    // desktop click handler that toggled would immediately undo the hover.
    const cleanup = initNavInteractions();
    const toggle = toggle1();

    toggle.dispatchEvent(new MouseEvent('mouseenter'));
    expect(toggle.classList.contains('active')).toBe(true);

    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toggle.classList.contains('active')).toBe(true);
    expect(panel1().classList.contains('visible')).toBe(true);

    cleanup();
  });

  it('only keeps one dropdown open at a time', () => {
    const cleanup = initNavInteractions();
    const first = toggle1();
    const second = document.getElementById('t2')!;

    first.dispatchEvent(new MouseEvent('mouseenter'));
    second.dispatchEvent(new MouseEvent('mouseenter'));

    expect(first.classList.contains('active')).toBe(false);
    expect(second.classList.contains('active')).toBe(true);

    cleanup();
  });

  it('closes an open dropdown on Escape', () => {
    const cleanup = initNavInteractions();
    const toggle = toggle1();

    toggle.dispatchEvent(new MouseEvent('mouseenter'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(toggle.classList.contains('active')).toBe(false);
    cleanup();
  });

  it('closes when clicking outside the nav', () => {
    const cleanup = initNavInteractions();
    const toggle = toggle1();

    toggle.dispatchEvent(new MouseEvent('mouseenter'));
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(toggle.classList.contains('active')).toBe(false);
    cleanup();
  });

  it('toggles the mobile menu open and closed', () => {
    const cleanup = initNavInteractions();
    const button = document.querySelector<HTMLElement>('.nav__menu-button')!;
    const menu = document.querySelector<HTMLElement>('.nav__menu')!;

    button.click();
    expect(menu.classList.contains('w--open')).toBe(true);
    expect(document.body.classList.contains('nav-menu-open')).toBe(true);

    button.click();
    expect(menu.classList.contains('w--open')).toBe(false);
    expect(document.body.classList.contains('nav-menu-open')).toBe(false);

    cleanup();
  });

  it('marks the nav as scrolled past the threshold', () => {
    const cleanup = initNavInteractions();
    const nav = document.querySelector<HTMLElement>('.nav')!;

    expect(nav.classList.contains('cc-scrolled')).toBe(false);

    Object.defineProperty(window, 'scrollY', { value: 400, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(nav.classList.contains('cc-scrolled')).toBe(true);

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(nav.classList.contains('cc-scrolled')).toBe(false);

    cleanup();
  });

  it('removes all listeners on cleanup', () => {
    const cleanup = initNavInteractions();
    cleanup();

    const toggle = toggle1();
    toggle.dispatchEvent(new MouseEvent('mouseenter'));
    expect(toggle.classList.contains('active')).toBe(false);
  });

  it('survives a page with no nav at all', () => {
    document.body.innerHTML = '<main></main>';
    expect(() => initNavInteractions()()).not.toThrow();
  });
});

describe('nav dropdowns on mobile', () => {
  beforeEach(() => {
    document.body.innerHTML = NAV_HTML;
    document.body.className = '';
    setMobileViewport(true);
  });

  afterEach(() => {
    setMobileViewport(false);
  });

  it('toggles on click instead of hover', () => {
    const cleanup = initNavInteractions();
    const toggle = toggle1();

    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toggle.classList.contains('active')).toBe(true);
    expect(panel1().classList.contains('mobile-visible')).toBe(true);
    // Desktop's `visible` class must not be used on mobile.
    expect(panel1().classList.contains('visible')).toBe(false);

    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toggle.classList.contains('active')).toBe(false);
    expect(panel1().classList.contains('mobile-visible')).toBe(false);

    cleanup();
  });

  it('ignores hover on mobile', () => {
    const cleanup = initNavInteractions();
    const toggle = toggle1();

    toggle.dispatchEvent(new MouseEvent('mouseenter'));
    expect(toggle.classList.contains('active')).toBe(false);

    cleanup();
  });

  it('does not blur the page content on mobile', () => {
    const cleanup = initNavInteractions();
    const content = document.querySelector<HTMLElement>('.content')!;

    toggle1().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toggle1().classList.contains('active')).toBe(true);
    expect(content.classList.contains('blur')).toBe(false);

    cleanup();
  });

  it('lets links inside the panel navigate normally', () => {
    const cleanup = initNavInteractions();
    const link = document.querySelector<HTMLAnchorElement>('#t1 .nav-dropdown a')!;

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    cleanup();
  });
});
