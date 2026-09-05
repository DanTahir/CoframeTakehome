/**
 * Mobile navbar open/close.
 *
 * The original page relies on Webflow's bundled `w-nav` widget for this. That
 * bundle is not shipped here (it also carries ix2, analytics hooks and form
 * handling we deliberately do not want), so this module reimplements exactly
 * the DOM contract the page's own CSS and scripts depend on:
 *
 *   - `.w-nav-menu` gains/loses the `data-nav-menu-open` attribute, which is
 *     what `webflow.css` keys the open state off (`display:block!important`)
 *     and what the nav-theming script's MutationObserver watches.
 *   - `.w-nav-button` gains/loses `w--open`.
 *   - The menu is placed inside a generated `.w-nav-overlay` sibling, matching
 *     the structure `.w-nav[data-animation=over-left] .w-nav-overlay` targets.
 *
 * `.nav__menu` carries `transform: none !important` in the site's own embedded
 * CSS, so Webflow's slide transform is irrelevant to the final appearance and
 * is not reproduced.
 */

export const NAV_COLLAPSE_BREAKPOINTS = {
  small: 479,
  medium: 767,
  large: 991,
} as const;

/** `data-collapse` token -> max width (px) at which the burger is shown. */
export function collapseWidthFor(token: string | null): number {
  switch (token) {
    case 'small':
      return NAV_COLLAPSE_BREAKPOINTS.small;
    case 'medium':
      return NAV_COLLAPSE_BREAKPOINTS.medium;
    case 'all':
      return Number.POSITIVE_INFINITY;
    default:
      // Webflow's "large" default, and what this page uses in practice.
      return NAV_COLLAPSE_BREAKPOINTS.large;
  }
}

export function initWebflowNav(): () => void {
  const nav = document.querySelector<HTMLElement>('.nav.w-nav');
  if (!nav) return () => {};

  const button = nav.querySelector<HTMLElement>('.w-nav-button');
  const menu = nav.querySelector<HTMLElement>('.w-nav-menu');
  if (!button || !menu) return () => {};

  // data-collapse="medium" on this page: burger below 768px. Webflow reports
  // the collapse width so CSS and JS agree on when the menu is a drawer.
  const collapseWidth = collapseWidthFor(nav.getAttribute('data-collapse'));

  let overlay = nav.querySelector<HTMLElement>('.w-nav-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'w-nav-overlay';
    overlay.setAttribute('data-wf-ignore', '');
    overlay.id = 'w-nav-overlay-0';
    menu.parentNode?.insertBefore(overlay, menu.nextSibling);
  }
  const createdOverlay = overlay;
  const menuHome = menu.parentNode;
  const menuNextSibling = menu.nextSibling;

  let open = false;

  const openMenu = () => {
    if (open) return;
    open = true;
    createdOverlay.appendChild(menu);
    createdOverlay.style.display = 'block';
    createdOverlay.style.height = '100vh';
    menu.setAttribute('data-nav-menu-open', '');
    button.classList.add('w--open');
    createdOverlay.classList.add('w--nav-overlay-open');
  };

  const closeMenu = () => {
    if (!open) return;
    open = false;
    menu.removeAttribute('data-nav-menu-open');
    button.classList.remove('w--open');
    createdOverlay.classList.remove('w--nav-overlay-open');
    createdOverlay.style.display = 'none';
    createdOverlay.style.removeProperty('height');
    // Restore the menu to its authored position so desktop layout is untouched.
    if (menuHome) menuHome.insertBefore(menu, menuNextSibling);
  };

  const toggle = (event: Event) => {
    event.preventDefault();
    if (open) closeMenu();
    else openMenu();
  };

  const onOverlayClick = (event: MouseEvent) => {
    // Tapping the dimmed area (not the menu itself) closes the drawer.
    if (event.target === createdOverlay) closeMenu();
  };

  // Following a nav link should dismiss the drawer.
  const onMenuClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('a')) closeMenu();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeMenu();
  };

  const onResize = () => {
    if (window.innerWidth > collapseWidth) closeMenu();
  };

  button.addEventListener('click', toggle);
  createdOverlay.addEventListener('click', onOverlayClick);
  menu.addEventListener('click', onMenuClick);
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);

  return () => {
    button.removeEventListener('click', toggle);
    createdOverlay.removeEventListener('click', onOverlayClick);
    menu.removeEventListener('click', onMenuClick);
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onResize);
    closeMenu();
  };
}
