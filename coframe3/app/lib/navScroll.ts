/**
 * Sticky-nav theming.
 *
 * Faithful port of the homepage's nav script. Past 50px of scroll the nav and
 * its children gain `cc-dark`; while the mobile menu is open the nav is forced
 * back to the transparent theme and body scroll is locked.
 */

export const NAV_SCROLL_THRESHOLD = 50;

/** Selectors that receive/lose the `cc-dark` class together with the nav. */
export const NAV_DARKEN_SELECTORS = [
  'nav',
  '.nav-wrap',
  '.nav__logo',
  '.nav__dropdown-toggle',
  '.nav__link',
  '.nav-dropdown',
  '.cta-invisible.cc-hero',
  '.nav__menu-button__image',
] as const;

export function collectNavDarkenTargets(root: ParentNode = document): HTMLElement[] {
  // The original mixed querySelector (first match) and querySelectorAll (all
  // matches) per selector; querySelectorAll over the same list is equivalent
  // for this markup and avoids missing repeated nav links.
  const out: HTMLElement[] = [];
  for (const selector of NAV_DARKEN_SELECTORS) {
    for (const el of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
      if (!out.includes(el)) out.push(el);
    }
  }
  return out;
}

export function initNavScroll(): () => void {
  const nav = document.querySelector<HTMLElement>('.nav');
  const mobileMenu = document.querySelector<HTMLElement>('.w-nav-menu');
  if (!nav || !mobileMenu) return () => {};

  const targets = collectNavDarkenTargets();
  const originalTheme = nav.getAttribute('data-nav-theme');

  const isNavMenuOpen = () => mobileMenu.getAttribute('data-nav-menu-open') !== null;

  const setDark = (on: boolean) => {
    for (const el of targets) el.classList.toggle('cc-dark', on);
  };

  const applyStyles = () => {
    if (isNavMenuOpen()) {
      setDark(false);
      nav.setAttribute('data-nav-theme', 'transparent');
    } else {
      setDark(window.scrollY > NAV_SCROLL_THRESHOLD);
      if (originalTheme) nav.setAttribute('data-nav-theme', originalTheme);
      else nav.removeAttribute('data-nav-theme');
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
  };
}
