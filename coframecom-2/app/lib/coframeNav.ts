/**
 * Navigation: scroll darkening, dropdowns, and the mobile burger menu.
 *
 * Ported from `scrape/analysis/script-16.js` (theme) and `script-17.js`
 * (dropdowns). The burger toggle is HAND-WRITTEN: upstream it is driven by
 * Webflow's `webflow.js`, which the sanitizer strips, and no captured inline
 * script contains it.
 */
import { $all, type Teardown } from './runtime';

/* ------------------------------------------------------------------ theme */

const SCROLL_THRESHOLD = 50;

/**
 * Adds/removes `cc-dark` on the nav cluster past 50px of scroll, and forces the
 * transparent theme while the mobile menu is open.
 *
 * Subtle and load-bearing: upstream's first entry is
 * `document.querySelector('nav')` — the first <nav> TAG. In this markup `.nav`
 * is a DIV and the only <nav> tag is the inner `.nav__menu`, so `div.nav`
 * itself is never given `cc-dark`; it is themed purely through its
 * `data-nav-theme` attribute. Preserved verbatim rather than "corrected".
 */
export function initCoframeNavTheme(root: ParentNode = document): Teardown | void {
  const navClass = root.querySelector<HTMLElement>('.nav');
  const mobileMenu = root.querySelector<HTMLElement>('.w-nav-menu');
  if (!navClass || !mobileMenu) return;

  const elementsToDarken: Array<HTMLElement | null> = [
    document.querySelector<HTMLElement>('nav'),
    document.querySelector<HTMLElement>('.nav-wrap'),
    document.querySelector<HTMLElement>('.nav__logo'),
    ...$all<HTMLElement>('.nav__dropdown-toggle'),
    ...$all<HTMLElement>('.nav__link'),
    ...$all<HTMLElement>('.nav-dropdown'),
    document.querySelector<HTMLElement>('.cta-invisible.cc-hero'),
    document.querySelector<HTMLElement>('.nav__menu-button__image'),
  ];

  const originalTheme = navClass.getAttribute('data-nav-theme');
  const isNavMenuOpen = () => mobileMenu.getAttribute('data-nav-menu-open') !== null;

  const resetStyles = () => {
    for (const el of elementsToDarken) el?.classList.remove('cc-dark');
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'visible';
  };

  const applyStyles = () => {
    const scrollDistance = window.scrollY;

    if (isNavMenuOpen()) {
      for (const el of elementsToDarken) el?.classList.remove('cc-dark');
      navClass.setAttribute('data-nav-theme', 'transparent');
    } else {
      if (scrollDistance > SCROLL_THRESHOLD) {
        for (const el of elementsToDarken) el?.classList.add('cc-dark');
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
    for (const el of elementsToDarken) el?.classList.remove('cc-dark');
    document.body.style.overflowY = '';
  };
}

/* --------------------------------------------------------------- dropdowns */

/**
 * Hover (desktop) / tap (mobile) dropdowns, keyed by matching `id` between a
 * `.nav__dropdown-toggle` and its `.nav-dropdown`.
 *
 * State is expressed only through the `visible` / `mobile-visible` CLASSES
 * that the captured CSS already styles — deliberately no inline positioning.
 * `.nav-dropdown` carries two same-specificity rules (an absolute desktop
 * overlay and an in-flow mobile one), so writing `position` inline here would
 * break one of the two layouts.
 */
export function initCoframeNavDropdowns(root: ParentNode = document): Teardown | void {
  const toggles = $all<HTMLElement>('.nav__dropdown-toggle', root);
  if (!toggles.length) return;

  const heroInnerContainerElement = document.querySelector<HTMLElement>('.hero__inner-container');
  const contentElement = document.querySelector<HTMLElement>('.content');
  const navElement = document.querySelector<HTMLElement>('.nav');

  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
  const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

  const getAnimationDuration = (element: HTMLElement) => {
    const computed = window.getComputedStyle(element);
    const transitionDuration = Number.parseFloat(computed.transitionDuration) * 1000;
    const animationDuration = Number.parseFloat(computed.animationDuration) * 1000;
    return Math.max(transitionDuration || 0, animationDuration || 0);
  };

  let activeDropdown: HTMLElement | null = null;
  const cleanups: Array<() => void> = [];
  const pairs: Array<{ toggle: HTMLElement; dropdown: HTMLElement }> = [];

  const hideDropdown = async (toggle: HTMLElement, dropdown: HTMLElement) => {
    dropdown.classList.remove('mobile-visible');
    dropdown.classList.remove('visible');
    toggle.classList.remove('active');

    contentElement?.classList.remove('blur');
    heroInnerContainerElement?.classList.remove('blur');

    const animationDuration = getAnimationDuration(dropdown);
    if (!isMobile()) await delay(animationDuration);

    if (navElement) navElement.style.borderColor = '';
    activeDropdown = null;
  };

  const showDropdown = async (toggle: HTMLElement, dropdown: HTMLElement) => {
    if (activeDropdown !== null && activeDropdown !== dropdown && !isMobile()) {
      const previous = pairs.find((p) => p.dropdown === activeDropdown);
      if (previous) await hideDropdown(previous.toggle, previous.dropdown);
    }

    toggle.classList.add('active');

    if (!isMobile()) {
      contentElement?.classList.add('blur');
      heroInnerContainerElement?.classList.add('blur');
    }

    if (navElement) navElement.style.borderColor = 'transparent';

    if (isMobile()) {
      dropdown.classList.add('mobile-visible');
      dropdown.classList.remove('visible');
    } else {
      dropdown.classList.add('visible');
      dropdown.classList.remove('mobile-visible');
    }

    activeDropdown = dropdown;
  };

  for (const toggle of toggles) {
    const dropdownId = toggle.getAttribute('id');
    if (!dropdownId) continue;
    const dropdown = document.querySelector<HTMLElement>(`.nav-dropdown[id="${dropdownId}"]`);
    if (!dropdown) continue;

    pairs.push({ toggle, dropdown });

    // Upstream binds click OR hover depending on the viewport at load time.
    // Both are bound here and gated at call time, so a resize across the
    // breakpoint cannot leave a dropdown permanently unreachable.
    const onClick = (e: Event) => {
      if (!isMobile()) return;
      e.preventDefault();
      if (dropdown.classList.contains('mobile-visible')) void hideDropdown(toggle, dropdown);
      else void showDropdown(toggle, dropdown);
    };
    const onToggleEnter = () => {
      if (isMobile()) return;
      void showDropdown(toggle, dropdown);
    };
    const onToggleLeave = () => {
      if (isMobile()) return;
      if (!dropdown.matches(':hover')) void hideDropdown(toggle, dropdown);
    };
    const onDropdownLeave = () => {
      if (isMobile()) return;
      if (!toggle.matches(':hover')) void hideDropdown(toggle, dropdown);
    };

    toggle.addEventListener('click', onClick);
    toggle.addEventListener('mouseenter', onToggleEnter);
    toggle.addEventListener('mouseleave', onToggleLeave);
    dropdown.addEventListener('mouseleave', onDropdownLeave);

    cleanups.push(() => {
      toggle.removeEventListener('click', onClick);
      toggle.removeEventListener('mouseenter', onToggleEnter);
      toggle.removeEventListener('mouseleave', onToggleLeave);
      dropdown.removeEventListener('mouseleave', onDropdownLeave);
      dropdown.classList.remove('visible', 'mobile-visible');
      toggle.classList.remove('active');
    });
  }

  const onResize = () => {
    for (const { dropdown } of pairs) {
      dropdown.classList.remove('mobile-visible');
      dropdown.classList.remove('visible');
    }
    activeDropdown = null;
  };
  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('resize', onResize);
    for (const c of cleanups) c();
  };
}

/* ----------------------------------------------------------- burger toggle */

/**
 * Mobile menu open/close.
 *
 * Hand-written stand-in for `webflow.js`. The contract that matters: the open
 * state MUST be the `data-nav-menu-open` attribute on `.w-nav-menu`, because
 * the captured CSS keys the open menu off that attribute AND
 * `initCoframeNavTheme` MutationObserver-watches that exact attribute.
 */
export function initCoframeNavToggle(root: ParentNode = document): Teardown | void {
  const button = root.querySelector<HTMLElement>('.w-nav-button');
  const menu = root.querySelector<HTMLElement>('.w-nav-menu');
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
    menu.removeAttribute('data-nav-menu-open');
    button.classList.remove('w--open');
  };
}
