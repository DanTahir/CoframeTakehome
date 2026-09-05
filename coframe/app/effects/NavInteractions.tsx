'use client';

import { useEffect } from 'react';

/**
 * Navigation behaviour, ported from the live site's `.nav-dropdown-script` and
 * `.nav-styling` embeds (see scrape/scripts/19-nav-dropdown-script.js).
 *
 * Dropdowns:
 *  - Each `.nav__dropdown-toggle` contains a `.nav-dropdown` panel sharing its
 *    id. Opening adds `active` to the toggle, which the original embed's CSS
 *    turns into `display: flex` on the panel:
 *    `.nav__dropdown-toggle.active .nav-dropdown { display: flex; }`
 *  - Desktop is hover-only (the original binds `click` *only* on mobile), and
 *    additionally sets `visible` on the panel, `blur` on `.content` /
 *    `.hero__inner-container`, and clears the nav's border colour.
 *  - Mobile (<=767px, matching the original's media query) toggles on click and
 *    uses `mobile-visible` instead of `visible`.
 *  - Leaving the toggle only closes the panel if the pointer isn't inside the
 *    panel itself, and vice versa — otherwise moving from the label down into
 *    the menu would dismiss it.
 *
 * `.nav__menu-button` toggles Webflow's mobile overlay menu (`w--open`), and
 * the nav gains `cc-scrolled` once scrolled away from the hero.
 *
 * Escape / outside-click dismissal is a deliberate addition on top of the
 * original (which has neither); it only ever closes an already-open panel, so
 * it cannot change the site's visual behaviour.
 */
const SCROLL_THRESHOLD = 24;

/** The original embed's breakpoint: `window.matchMedia('(max-width: 767px)')`. */
const MOBILE_QUERY = '(max-width: 767px)';

export function initNavInteractions(root: ParentNode = document): () => void {
  const cleanups: Array<() => void> = [];

  const nav = root.querySelector<HTMLElement>('.nav');
  const toggles = Array.from(root.querySelectorAll<HTMLElement>('.nav__dropdown-toggle'));
  const menuButton = root.querySelector<HTMLElement>('.nav__menu-button');
  const menu = root.querySelector<HTMLElement>('.nav__menu');
  const overlay = root.querySelector<HTMLElement>('.nav__menu-mobile-overlay');
  const content = root.querySelector<HTMLElement>('.content');
  const heroInner = root.querySelector<HTMLElement>('.hero__inner-container');

  const isMobile = () =>
    typeof window !== 'undefined' && (window.matchMedia?.(MOBILE_QUERY).matches ?? false);

  /** The panel nested inside a toggle (they share an id on the live site). */
  const panelFor = (toggle: HTMLElement) =>
    toggle.querySelector<HTMLElement>('.nav-dropdown');

  const setBlur = (on: boolean) => {
    content?.classList.toggle('blur', on);
    heroInner?.classList.toggle('blur', on);
  };

  const hide = (toggle: HTMLElement) => {
    const panel = panelFor(toggle);
    panel?.classList.remove('visible', 'mobile-visible');
    toggle.classList.remove('active');
    setBlur(false);
    if (nav) nav.style.borderColor = '';
  };

  const show = (toggle: HTMLElement) => {
    // Only one panel may be open at a time.
    for (const other of toggles) if (other !== toggle) hide(other);

    const panel = panelFor(toggle);
    toggle.classList.add('active');

    if (isMobile()) {
      panel?.classList.add('mobile-visible');
      panel?.classList.remove('visible');
    } else {
      panel?.classList.add('visible');
      panel?.classList.remove('mobile-visible');
      setBlur(true);
    }

    if (nav) nav.style.borderColor = 'transparent';
  };

  const closeAll = () => toggles.forEach(hide);

  for (const toggle of toggles) {
    const panel = panelFor(toggle);

    // Desktop: hover. The original only attaches click on mobile, so a desktop
    // click must not toggle the panel shut.
    const onEnter = () => {
      if (isMobile()) return;
      show(toggle);
    };
    const onToggleLeave = () => {
      if (isMobile()) return;
      // Don't close while the pointer is moving into the panel.
      if (panel?.matches(':hover')) return;
      hide(toggle);
    };
    const onPanelLeave = () => {
      if (isMobile()) return;
      if (toggle.matches(':hover')) return;
      hide(toggle);
    };
    // Mobile: click toggles.
    const onClick = (event: MouseEvent) => {
      if (!isMobile()) return;
      // Let real links inside the panel navigate normally.
      if ((event.target as HTMLElement).closest('a')) return;
      event.preventDefault();
      if (toggle.classList.contains('active')) hide(toggle);
      else show(toggle);
    };

    toggle.addEventListener('mouseenter', onEnter);
    toggle.addEventListener('mouseleave', onToggleLeave);
    toggle.addEventListener('click', onClick);
    panel?.addEventListener('mouseleave', onPanelLeave);
    cleanups.push(() => {
      toggle.removeEventListener('mouseenter', onEnter);
      toggle.removeEventListener('mouseleave', onToggleLeave);
      toggle.removeEventListener('click', onClick);
      panel?.removeEventListener('mouseleave', onPanelLeave);
    });
  }

  // Addition on top of the original: dismiss an open panel on outside click or
  // Escape. Never opens anything, so it can't diverge from the live behaviour.
  const onDocumentClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.nav__dropdown-toggle')) closeAll();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeAll();
      menu?.classList.remove('w--open');
      menuButton?.classList.remove('w--open');
      document.body.classList.remove('nav-menu-open');
    }
  };
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeyDown);
  cleanups.push(() => {
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onKeyDown);
  });

  // Mobile menu toggle.
  if (menuButton && menu) {
    const toggleMenu = () => {
      const open = menu.classList.toggle('w--open');
      menuButton.classList.toggle('w--open', open);
      document.body.classList.toggle('nav-menu-open', open);
    };
    menuButton.addEventListener('click', toggleMenu);
    cleanups.push(() => menuButton.removeEventListener('click', toggleMenu));

    if (overlay) {
      const closeMenu = () => {
        menu.classList.remove('w--open');
        menuButton.classList.remove('w--open');
        document.body.classList.remove('nav-menu-open');
      };
      overlay.addEventListener('click', closeMenu);
      cleanups.push(() => overlay.removeEventListener('click', closeMenu));
    }
  }

  // Solid nav theme once scrolled away from the hero.
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('cc-scrolled', window.scrollY > SCROLL_THRESHOLD);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', onScroll));
  }

  return () => cleanups.forEach((fn) => fn());
}

export default function NavInteractions() {
  useEffect(() => initNavInteractions(), []);
  return null;
}
