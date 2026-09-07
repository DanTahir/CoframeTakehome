/**
 * Dropbox-specific navigation behaviour.
 *
 * The live page ships a `dwg-*` component library whose JavaScript codegen
 * strips, leaving the markup in its pristine closed state. Two behaviours have
 * to be re-implemented against the exact class + ARIA contract that the
 * captured markup and CSS already encode:
 *
 *   1. Six dropdown triggers (`button[aria-controls]`) — three in the desktop
 *      bar, three inside the mobile panel — each pointing by id at a sibling
 *      `.dwg-nav-item__dropdown`.
 *   2. The mobile burger (`.dwg-nav__hamburger-button`), which opens the single
 *      `.dwg-nav-mobile-dropdown`.
 *
 * NON-OBVIOUS, LOAD-BEARING DETAIL
 * --------------------------------
 * Every one of the six panels also carries
 * `.dwg-nav-item--nav-redesign__dropdown`, so the two-class rule
 *
 *   .dwg-nav-item--nav-redesign__dropdown.dwg-nav-item__dropdown--open{
 *     max-height: var(--dwg-nav-current-dropdown-height) }
 *
 * outranks the plain `.dwg-nav-item__dropdown--open{max-height:none}` — and
 * `--dwg-nav-current-dropdown-height` is defined in *none* of the captured
 * stylesheets, because the original JS set it inline per-dropdown as it
 * measured the panel. Adding the open class alone would therefore transition
 * to `max-height: 0` and reveal nothing at all. We measure `scrollHeight`
 * (unaffected by the `overflow:hidden` clip) and set the property ourselves.
 *
 * The mobile panel needs no such help: it ships an inline
 * `--dwg-nav-mobile-dropdown__mobile-dropdown-max-height: 100vh`.
 */
import { $all, type Teardown } from './runtime';

const PANEL_OPEN = 'dwg-nav-item__dropdown--open';
const BURGER_OPEN = 'dwg-nav__hamburger-button--open';
const MOBILE_OPEN = 'dwg-nav-mobile-dropdown--open';
const HEIGHT_VAR = '--dwg-nav-current-dropdown-height';

interface Entry {
  button: HTMLElement;
  panel: HTMLElement;
  /** Container that owns hover intent on desktop. */
  item: HTMLElement;
  /** True for the three triggers nested inside the mobile panel. */
  mobile: boolean;
}

export function initDropboxNav(root: ParentNode = document): Teardown | void {
  const nav = root.querySelector<HTMLElement>('nav.dwg-nav');
  if (!nav) return;

  // Idempotent: React strict mode mounts effects twice in development.
  if (nav.dataset.replicaNavBound === 'true') return;
  nav.dataset.replicaNavBound = 'true';

  const entries: Entry[] = [];
  for (const button of $all<HTMLElement>('button[aria-controls]', nav)) {
    const id = button.getAttribute('aria-controls');
    if (!id) continue;
    const panel = nav.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);
    if (!panel) continue;
    entries.push({
      button,
      panel,
      item: button.closest<HTMLElement>('.dwg-nav-item') ?? button.parentElement ?? button,
      mobile: Boolean(button.closest('.dwg-nav-mobile-dropdown')),
    });
  }

  const burger = nav.querySelector<HTMLElement>('.dwg-nav__hamburger-button');
  const mobilePanel = nav.querySelector<HTMLElement>('.dwg-nav-mobile-dropdown');

  const cleanups: Array<() => void> = [];
  let hoverTimer: number | undefined;

  const setPanel = (entry: Entry, open: boolean) => {
    if (open) {
      // Supply the custom property the original JS used to set inline.
      entry.panel.style.setProperty(HEIGHT_VAR, `${entry.panel.scrollHeight}px`);
    }
    entry.panel.classList.toggle(PANEL_OPEN, open);
    // These buttons genuinely ship aria-expanded="false" in the live DOM, so
    // driving it here restores the real contract rather than inventing one.
    entry.button.setAttribute('aria-expanded', String(open));
  };

  /** Only ever one panel open per group (desktop bar vs mobile panel). */
  const openOnly = (target: Entry | null, group: boolean) => {
    for (const entry of entries) {
      if (entry.mobile !== group) continue;
      setPanel(entry, entry === target);
    }
  };

  const setMobile = (open: boolean) => {
    if (!burger || !mobilePanel) return;
    mobilePanel.classList.toggle(MOBILE_OPEN, open);
    burger.classList.toggle(BURGER_OPEN, open);
    // Deliberately NOT setting aria-expanded: the live burger has no such
    // attribute (it carries role="menu"), and inventing one would show up as
    // a false positive in the DOM diff against the original.
    if (!open) openOnly(null, true);
  };

  const closeEverything = () => {
    openOnly(null, false);
    setMobile(false);
  };

  for (const entry of entries) {
    const onClick = (e: Event) => {
      e.preventDefault();
      const willOpen = !entry.panel.classList.contains(PANEL_OPEN);
      openOnly(willOpen ? entry : null, entry.mobile);
    };
    entry.button.addEventListener('click', onClick);
    cleanups.push(() => entry.button.removeEventListener('click', onClick));

    // Hover intent, desktop bar only — the mobile triggers are accordions.
    if (!entry.mobile) {
      const onEnter = () => {
        window.clearTimeout(hoverTimer);
        openOnly(entry, false);
      };
      const onLeave = () => {
        window.clearTimeout(hoverTimer);
        hoverTimer = window.setTimeout(() => openOnly(null, false), 120);
      };
      entry.item.addEventListener('mouseenter', onEnter);
      entry.item.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        entry.item.removeEventListener('mouseenter', onEnter);
        entry.item.removeEventListener('mouseleave', onLeave);
      });
    }
  }

  if (burger && mobilePanel) {
    const onBurger = (e: Event) => {
      e.preventDefault();
      setMobile(!mobilePanel.classList.contains(MOBILE_OPEN));
    };
    burger.addEventListener('click', onBurger);
    cleanups.push(() => burger.removeEventListener('click', onBurger));
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeEverything();
  };
  const onDocClick = (e: MouseEvent) => {
    if (!nav.contains(e.target as Node)) closeEverything();
  };
  document.addEventListener('keydown', onKey);
  document.addEventListener('click', onDocClick);
  cleanups.push(() => {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('click', onDocClick);
  });

  return () => {
    window.clearTimeout(hoverTimer);
    for (const fn of cleanups) fn();
    closeEverything();
    delete nav.dataset.replicaNavBound;
  };
}
