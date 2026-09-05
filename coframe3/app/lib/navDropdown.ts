/**
 * Nav dropdown menus (Product / Resources).
 *
 * Faithful port: desktop opens on hover and blurs the page behind the panel;
 * mobile (<=767px) toggles on click with no blur. Only one panel is open at a
 * time on desktop, and the nav border goes transparent while a panel is open.
 *
 * Deviation from the original, deliberate: the original decided hover-vs-click
 * once at DOMContentLoaded, so a desktop->mobile resize left hover handlers
 * bound and the panels unusable by touch. This port binds both handler sets and
 * gates them on a live `isMobile()` check, so the behaviour is correct at every
 * viewport width without changing what happens at any single width.
 */

export const MOBILE_DROPDOWN_QUERY = '(max-width: 767px)';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function animationDurationOf(element: Element): number {
  const computed = window.getComputedStyle(element);
  const transition = Number.parseFloat(computed.transitionDuration) * 1000;
  const animation = Number.parseFloat(computed.animationDuration) * 1000;
  return Math.max(Number.isNaN(transition) ? 0 : transition, Number.isNaN(animation) ? 0 : animation);
}

export function initNavDropdowns(): () => void {
  const toggles = Array.from(document.querySelectorAll<HTMLElement>('.nav__dropdown-toggle'));
  if (toggles.length === 0) return () => {};

  const heroInner = document.querySelector<HTMLElement>('.hero__inner-container');
  const content = document.querySelector<HTMLElement>('.content');
  const nav = document.querySelector<HTMLElement>('.nav');

  const isMobile = () => window.matchMedia(MOBILE_DROPDOWN_QUERY).matches;

  let activeDropdown: HTMLElement | null = null;
  const cleanups: Array<() => void> = [];

  const hideDropdown = async (dropdown: HTMLElement, toggle: HTMLElement) => {
    dropdown.classList.remove('mobile-visible');
    dropdown.classList.remove('visible');
    toggle.classList.remove('active');

    content?.classList.remove('blur');
    heroInner?.classList.remove('blur');

    const duration = animationDurationOf(dropdown);
    if (!isMobile()) await delay(duration);

    if (nav) nav.style.borderColor = '';
    activeDropdown = null;
  };

  const showDropdown = async (dropdown: HTMLElement, toggle: HTMLElement) => {
    if (activeDropdown !== null && activeDropdown !== dropdown && !isMobile()) {
      const previousToggle = toggles.find(
        (t) => t.getAttribute('id') === activeDropdown?.getAttribute('id'),
      );
      await hideDropdown(activeDropdown, previousToggle ?? toggle);
    }

    toggle.classList.add('active');

    if (!isMobile()) {
      content?.classList.add('blur');
      heroInner?.classList.add('blur');
    }

    if (nav) nav.style.borderColor = 'transparent';

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
    const id = toggle.getAttribute('id');
    if (!id) continue;
    const dropdown = document.querySelector<HTMLElement>(`.nav-dropdown[id="${id}"]`);
    if (!dropdown) continue;

    const onClick = () => {
      if (!isMobile()) return;
      if (dropdown.classList.contains('mobile-visible')) void hideDropdown(dropdown, toggle);
      else void showDropdown(dropdown, toggle);
    };

    const onToggleEnter = () => {
      if (isMobile()) return;
      void showDropdown(dropdown, toggle);
    };

    const onToggleLeave = () => {
      if (isMobile()) return;
      if (!dropdown.matches(':hover')) void hideDropdown(dropdown, toggle);
    };

    const onDropdownLeave = () => {
      if (isMobile()) return;
      if (!toggle.matches(':hover')) void hideDropdown(dropdown, toggle);
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
    });
  }

  const resetAll = () => {
    for (const toggle of toggles) {
      const id = toggle.getAttribute('id');
      if (!id) continue;
      const dropdown = document.querySelector<HTMLElement>(`.nav-dropdown[id="${id}"]`);
      dropdown?.classList.remove('mobile-visible', 'visible');
      toggle.classList.remove('active');
    }
    content?.classList.remove('blur');
    heroInner?.classList.remove('blur');
    activeDropdown = null;
  };

  window.addEventListener('resize', resetAll);
  cleanups.push(() => window.removeEventListener('resize', resetAll));

  return () => {
    for (const fn of cleanups) fn();
  };
}
