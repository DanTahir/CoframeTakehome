/**
 * Nav theming: darkens the header once the page is scrolled, and forces the
 * transparent theme while the mobile menu is open.
 *
 * FIDELITY NOTE -- the selector `'nav'` is deliberate and must not be
 * "corrected" to `'.nav'`. On this site `.nav` is a <div> wrapper, and the only
 * real <nav> element is `.nav__menu`, so the original script's
 * `document.querySelector('nav')` darkens the inner menu, NOT the outer wrapper.
 * Swapping in `.nav` changes which element receives `.cc-dark` and visibly
 * breaks the scrolled header.
 */
import { $all, type Teardown } from './runtime';

const SCROLL_THRESHOLD = 50;

export function initCoframeNavTheme(root: ParentNode = document): Teardown | void {
  const scope: ParentNode = root ?? document;
  const navClass = scope.querySelector<HTMLElement>('.nav');
  const mobileMenu = scope.querySelector<HTMLElement>('.w-nav-menu');
  if (!navClass || !mobileMenu) return;

  const elementsToDarken: Array<Element | null> = [
    scope.querySelector('nav'), // see FIDELITY NOTE above: resolves to .nav__menu
    scope.querySelector('.nav-wrap'),
    scope.querySelector('.nav__logo'),
    ...Array.from(scope.querySelectorAll('.nav__dropdown-toggle')),
    ...Array.from(scope.querySelectorAll('.nav__link')),
    ...Array.from(scope.querySelectorAll('.nav-dropdown')),
    scope.querySelector('.cta-invisible.cc-hero'),
    scope.querySelector('.nav__menu-button__image'),
  ];

  const originalTheme = navClass.getAttribute('data-nav-theme');

  const isNavMenuOpen = () => mobileMenu.getAttribute('data-nav-menu-open') !== null;

  const resetStyles = () => {
    for (const el of elementsToDarken) el?.classList?.remove('cc-dark');
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'visible';
  };

  const applyStyles = () => {
    const scrollDistance = window.scrollY;

    if (isNavMenuOpen()) {
      for (const el of elementsToDarken) el?.classList?.remove('cc-dark');
      navClass.setAttribute('data-nav-theme', 'transparent');
    } else {
      if (scrollDistance > SCROLL_THRESHOLD) {
        for (const el of elementsToDarken) el?.classList?.add('cc-dark');
      } else {
        resetStyles();
      }
      if (originalTheme) navClass.setAttribute('data-nav-theme', originalTheme);
      else navClass.removeAttribute('data-nav-theme');
    }

    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = isNavMenuOpen() ? 'hidden' : 'visible';
  };

  const observer = new MutationObserver(applyStyles);
  observer.observe(mobileMenu, { attributes: true, attributeFilter: ['data-nav-menu-open'] });

  window.addEventListener('scroll', applyStyles);
  window.addEventListener('resize', applyStyles);

  applyStyles();

  return () => {
    observer.disconnect();
    window.removeEventListener('scroll', applyStyles);
    window.removeEventListener('resize', applyStyles);
    resetStyles();
    document.body.style.removeProperty('overflow-x');
    document.body.style.removeProperty('overflow-y');
  };
}

/**
 * Mobile menu open/close.
 *
 * This behaviour came from Webflow's own `webflow.js`, which the sanitizer
 * drops, so it has to be supplied here. The contract that matters is the
 * `data-nav-menu-open` attribute on `.w-nav-menu`: the captured CSS keys the
 * open menu off it (`[data-nav-menu-open]{...display:block!important}`), and
 * `initCoframeNavTheme` above watches that exact attribute to force the
 * transparent theme. Using a different open-state flag would break both.
 */
export function initCoframeNavToggle(root: ParentNode = document): Teardown | void {
  const scope: ParentNode = root ?? document;
  const button = scope.querySelector<HTMLElement>('.w-nav-button');
  const menu = scope.querySelector<HTMLElement>('.w-nav-menu');
  if (!button || !menu) return;

  let open = false;

  const apply = (next: boolean) => {
    open = next;
    if (open) menu.setAttribute('data-nav-menu-open', '');
    else menu.removeAttribute('data-nav-menu-open');
    button.classList.toggle('w--open', open);
    button.setAttribute('aria-expanded', String(open));
  };

  const onButton = (e: Event) => {
    e.preventDefault();
    apply(!open);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) apply(false);
  };

  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', onButton);
  document.addEventListener('keydown', onKey);

  return () => {
    button.removeEventListener('click', onButton);
    document.removeEventListener('keydown', onKey);
    apply(false);
  };
}

/**
 * Nav dropdown panels.
 *
 * Also originally a Webflow IX2 interaction (no captured script drives it), so
 * it is reconstructed: hover on desktop, tap on mobile.
 *
 * The panel's base CSS is `display:none; opacity:0`, and there are two
 * same-specificity `.nav-dropdown` rules -- one positioning it `absolute`
 * (desktop overlay) and one `relative` (in-flow inside the mobile menu). Only
 * `display`/`opacity`/`pointer-events` are set inline here so whichever
 * `position` the cascade resolves to at the current breakpoint is left intact.
 */
export function initCoframeNavDropdown(root: ParentNode = document): Teardown | void {
  const toggles = $all<HTMLElement>('.nav__dropdown-toggle', root);
  if (!toggles.length) return;

  const cleanups: Array<() => void> = [];

  for (const toggle of toggles) {
    // The panel is nested *inside* its toggle in this markup.
    const panel = toggle.querySelector<HTMLElement>('.nav-dropdown');
    if (!panel) continue;

    const setOpen = (next: boolean) => {
      if (next) {
        panel.style.display = 'flex';
        panel.style.opacity = '1';
        panel.style.pointerEvents = 'auto';
        toggle.classList.add('w--open');
      } else {
        panel.style.removeProperty('display');
        panel.style.removeProperty('opacity');
        panel.style.removeProperty('pointer-events');
        toggle.classList.remove('w--open');
      }
    };

    const isDesktop = () => window.innerWidth >= 992;

    const onEnter = () => {
      if (isDesktop()) setOpen(true);
    };
    const onLeave = () => {
      if (isDesktop()) setOpen(false);
    };
    const onClick = (e: Event) => {
      if (isDesktop()) return;
      // Let real links inside the panel navigate normally.
      if ((e.target as Element | null)?.closest('a')) return;
      e.preventDefault();
      setOpen(!toggle.classList.contains('w--open'));
    };

    toggle.addEventListener('mouseenter', onEnter);
    toggle.addEventListener('mouseleave', onLeave);
    toggle.addEventListener('click', onClick);

    cleanups.push(() => {
      toggle.removeEventListener('mouseenter', onEnter);
      toggle.removeEventListener('mouseleave', onLeave);
      toggle.removeEventListener('click', onClick);
      setOpen(false);
    });
  }

  if (!cleanups.length) return;
  return () => cleanups.forEach((c) => c());
}
