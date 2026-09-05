// Nav theme-on-scroll behaviour.
// Ported from the page's inline nav script: past 50px of scroll the nav and its
// children get .cc-dark; while the mobile menu is open the nav is forced back to
// the transparent theme and body scrolling is locked.

export const SCROLL_THRESHOLD = 50;

function darkenTargets(root: ParentNode): Element[] {
  const targets: Array<Element | null> = [
    root.querySelector('nav'),
    root.querySelector('.nav-wrap'),
    root.querySelector('.nav__logo'),
    ...Array.from(root.querySelectorAll('.nav__dropdown-toggle')),
    ...Array.from(root.querySelectorAll('.nav__link')),
    ...Array.from(root.querySelectorAll('.nav-dropdown')),
    root.querySelector('.cta-invisible.cc-hero'),
    root.querySelector('.nav__menu-button__image'),
  ];
  return targets.filter((el): el is Element => el !== null);
}

export function initNavScroll(root: ParentNode = document): () => void {
  const nav = root.querySelector('.nav');
  const mobileMenu = root.querySelector('.w-nav-menu');
  if (!nav || !mobileMenu) return () => {};

  const elementsToDarken = darkenTargets(root);
  const originalTheme = nav.getAttribute('data-nav-theme');

  const isNavMenuOpen = () => mobileMenu.getAttribute('data-nav-menu-open') !== null;

  const resetStyles = () => {
    elementsToDarken.forEach((el) => el.classList.remove('cc-dark'));
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'visible';
  };

  const applyStyles = () => {
    const scrollDistance = window.scrollY;

    if (isNavMenuOpen()) {
      elementsToDarken.forEach((el) => el.classList.remove('cc-dark'));
      nav.setAttribute('data-nav-theme', 'transparent');
    } else {
      if (scrollDistance > SCROLL_THRESHOLD) {
        elementsToDarken.forEach((el) => el.classList.add('cc-dark'));
      } else {
        resetStyles();
      }
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
