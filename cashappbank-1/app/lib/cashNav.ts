/**
 * Nav header + mobile navigation overlay — re-implementation of the original
 * `GalleryNavHeader` / `GalleryNavMenuSection` / `GalleryMenuButton` trio.
 *
 * Recovered logic (from the captured JS chunks):
 *
 *     <header className={cx(styles.galleryNavHeader, {[styles.navOpen]: !!open})}
 *             data-show-promo-pill={...} data-nav-open={open} style={Theme.apply(...)}>
 *     <GalleryMenuButton aria-controls="navigation-overlay"
 *             onClick={() => setOpen(!open)} state={open ? 'active' : 'inactive'} />
 *     <GalleryNavMenuSection visible={open} id="navigation-overlay" ... />
 *
 *     // menu button:  cx(styles.galleryMenuButton, {[styles.active]: state === 'active'})
 *     // overlay nav:  cx(styles.galleryNavMenuSection, {[styles.visible]: visible})
 *
 *     useEffect(() => { if (!isMobilePhone()) open ? disablePageScroll() : enablePageScroll() }, [open])
 *     window.addEventListener('keyup', e => { if (e.key === 'Escape' && open) setOpen(false) })
 *
 * Notable recovered details:
 *
 *  - `styles.navOpen` is **not** a key in the nav-header style map, so it
 *    resolves to `undefined` and `clsx` drops it. The real styling hook is the
 *    `data-nav-open` attribute, which the site's CSS keys off. That attribute is
 *    therefore the source of truth here (and `cashVideos` observes it to pause
 *    playback while the menu is open).
 *  - The login button's inline theme swaps to `whiteFilled` while the menu is
 *    open (`g[open ? 'whiteFilled' : b.buttonTheme]`); the header's own `style`
 *    uses the static per-page theme and does not change.
 *  - The overlay markup is already present in the captured DOM, so this only
 *    toggles visibility classes — nothing is constructed from `__NEXT_DATA__`.
 */

import { siblingClass, toggleSibling } from './cssModules';
import type { EffectInit, Teardown } from './runtime';

const WIRED_ATTR = 'data-replica-nav-wired';
const OVERLAY_ID = 'navigation-overlay';

/** Theme variable sets recovered from the bundle's button theme table. */
const WHITE_FILLED = {
  '--button-background-color': '#FFFFFF',
  '--button-border-color': '#000000',
  '--button-text-color': '#000000',
} as const;

function applyTheme(el: HTMLElement, theme: Record<string, string>): void {
  for (const [key, value] of Object.entries(theme)) el.style.setProperty(key, value);
}

/**
 * Approximates the original's `isMobilePhone()` UA check, which decides whether
 * page scroll is locked while the overlay is open (phones keep scrolling).
 */
function isMobilePhone(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android.*Mobile|iPhone|iPod|Windows Phone|BlackBerry/i.test(navigator.userAgent);
}

export const initCashNav: EffectInit = (root: ParentNode = document): Teardown | void => {
  const header = root.querySelector<HTMLElement>('header[data-nav-open]');
  if (!header) return;
  if (header.getAttribute(WIRED_ATTR) === '1') return;

  const menuButton = header.querySelector<HTMLElement>(`[aria-controls="${OVERLAY_ID}"]`);
  const overlay = (root as ParentNode & { getElementById?: never }).querySelector?.(
    `#${OVERLAY_ID}`,
  ) as HTMLElement | null;
  // The visibility class lives on the <nav> that *wraps* #navigation-overlay.
  const navSection =
    overlay?.closest<HTMLElement>('[class*="__galleryNavMenuSection"]') ??
    root.querySelector<HTMLElement>('[class*="__galleryNavMenuSection"]');

  if (!menuButton || !navSection) return;
  header.setAttribute(WIRED_ATTR, '1');

  // The login button is the header button that is NOT the signup button.
  const loginButton =
    Array.from(header.querySelectorAll<HTMLElement>('a[class*="__button"]')).find(
      (el) => !Array.from(el.classList).some((c) => c.endsWith('__signupButton')),
    ) ?? null;
  const loginOriginalStyle = loginButton?.getAttribute('style') ?? null;

  const scrollLockTargets = [document.documentElement, document.body];
  const savedOverflow = scrollLockTargets.map((el) => el.style.overflow);

  let open = header.getAttribute('data-nav-open') === 'true';

  const render = () => {
    header.setAttribute('data-nav-open', open ? 'true' : 'false');
    toggleSibling(menuButton, 'galleryMenuButton', 'active', open);
    toggleSibling(navSection, 'galleryNavMenuSection', 'visible', open);
    navSection.setAttribute('aria-hidden', open ? 'false' : 'true');

    if (loginButton) {
      if (open) applyTheme(loginButton, WHITE_FILLED);
      else if (loginOriginalStyle !== null) loginButton.setAttribute('style', loginOriginalStyle);
      else loginButton.removeAttribute('style');
    }

    // Matches `if (!isMobilePhone()) open ? disablePageScroll() : enablePageScroll()`.
    if (!isMobilePhone()) {
      scrollLockTargets.forEach((el, i) => {
        el.style.overflow = open ? 'hidden' : savedOverflow[i];
      });
    }
  };

  const setOpen = (next: boolean) => {
    if (next === open) return;
    open = next;
    render();
  };

  render();

  const onMenuClick = (event: Event) => {
    // The menu button is an <a> with no href.
    event.preventDefault();
    setOpen(!open);
  };
  menuButton.addEventListener('click', onMenuClick);

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Escape') setOpen(false);
  };
  window.addEventListener('keyup', onKeyUp);

  return () => {
    menuButton.removeEventListener('click', onMenuClick);
    window.removeEventListener('keyup', onKeyUp);
    header.removeAttribute(WIRED_ATTR);

    // Restore the pristine closed state on unmount.
    open = false;
    render();
    const visibleCls = siblingClass(navSection, 'galleryNavMenuSection', 'visible');
    if (visibleCls) navSection.classList.remove(visibleCls);
    scrollLockTargets.forEach((el, i) => {
      el.style.overflow = savedOverflow[i];
    });
  };
};
