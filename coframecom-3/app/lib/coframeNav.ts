/**
 * Navigation behaviours specific to coframe.com replica.
 *
 * Ports the captured scripts:
 *   - script-16.js: nav scroll darkening + mobile menu state management
 *   - script-17.js: dropdown hover/click toggle (desktop/mobile)
 *
 * Quirks preserved:
 *   - Mobile menu toggle is managed via mutation observer watching data-nav-menu-open
 *   - Dropdown state uses separate classes for mobile vs desktop (mobile-visible / visible)
 *   - Nav border color is set to transparent when any dropdown is open
 *   - Content blur effect on desktop dropdown open
 */
import { type Teardown } from './runtime';

export function initCoframeNav(root: ParentNode = document): Teardown | void {
  const navClass = root.querySelector<HTMLElement>('.nav');
  const mobileMenu = root.querySelector<HTMLElement>('.w-nav-menu');

  if (!navClass || !mobileMenu) return;

  return initCoframeNavImpl(root, navClass, mobileMenu);
}

function initCoframeNavImpl(
  root: ParentNode,
  navClass: HTMLElement,
  mobileMenu: HTMLElement,
): Teardown {
  // Part 1: Nav scroll darkening (script-16.js)

  const SCROLL_THRESHOLD = 50;

  // Elements to add/remove the .cc-dark class
  const elementsToDarken: HTMLElement[] = [
    root.querySelector('nav'),
    root.querySelector('.nav-wrap'),
    root.querySelector('.nav__logo'),
    ...Array.from(root.querySelectorAll<HTMLElement>('.nav__dropdown-toggle')),
    ...Array.from(root.querySelectorAll<HTMLElement>('.nav__link')),
    ...Array.from(root.querySelectorAll<HTMLElement>('.nav-dropdown')),
    root.querySelector('.cta-invisible.cc-hero'),
    root.querySelector('.nav__menu-button__image'),
  ].filter((el): el is HTMLElement => el !== null);

  // Store the original theme for reset
  const originalTheme = navClass.getAttribute('data-nav-theme');

  // Function to check if the mobile menu is open
  function isNavMenuOpen(): boolean {
    return mobileMenu.getAttribute('data-nav-menu-open') !== null;
  }

  // Function to apply or reset styles
  function applyStyles(): void {
    const scrollDistance = window.scrollY;

    if (isNavMenuOpen()) {
      // Remove .cc-dark and apply transparent theme when mobile menu is open
      elementsToDarken.forEach((el) => {
        el.classList.remove('cc-dark');
      });
      navClass.setAttribute('data-nav-theme', 'transparent');
    } else {
      // Revert to original theme or apply .cc-dark if scrolled past threshold
      if (scrollDistance > SCROLL_THRESHOLD) {
        elementsToDarken.forEach((el) => {
          el.classList.add('cc-dark');
        });
      } else {
        resetStyles();
      }
      // Revert to original theme
      if (originalTheme) {
        navClass.setAttribute('data-nav-theme', originalTheme);
      } else {
        navClass.removeAttribute('data-nav-theme');
      }
    }

    // Control body scroll behavior
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = isNavMenuOpen() ? 'hidden' : 'visible';
  }

  // Function to reset styles to initial state
  function resetStyles(): void {
    elementsToDarken.forEach((el) => {
      el.classList.remove('cc-dark');
    });
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'visible';
  }

  // Observe changes to 'data-nav-menu-open' on mobile menu
  const observer = new MutationObserver(() => applyStyles());
  observer.observe(mobileMenu, {
    attributes: true,
    attributeFilter: ['data-nav-menu-open'],
  });

  // Reapply styles on scroll and window resize
  let scrollRAFId: number | null = null;
  const onScroll = (): void => {
    if (scrollRAFId !== null) return;
    scrollRAFId = requestAnimationFrame(() => {
      applyStyles();
      scrollRAFId = null;
    });
  };
  window.addEventListener('scroll', onScroll);
  window.addEventListener('resize', () => applyStyles());

  // Initial style application
  applyStyles();

  // Part 2: Dropdown hover/click toggle (script-17.js)

  async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const dropdownToggles = Array.from(root.querySelectorAll<HTMLElement>('.nav__dropdown-toggle'));
  const heroInnerContainerElement = root.querySelector<HTMLElement>('.hero__inner-container');
  const contentElement = root.querySelector<HTMLElement>('.content');
  const navElement = root.querySelector<HTMLElement>('.nav');

  let activeDropdown: HTMLElement | null = null;

  // Function to check if the screen is mobile
  const isMobile = (): boolean => window.matchMedia('(max-width: 767px)').matches;

  // Function to get computed animation duration
  const getAnimationDuration = (element: HTMLElement): number => {
    const computedStyle = window.getComputedStyle(element);
    const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000;
    const animationDuration = parseFloat(computedStyle.animationDuration) * 1000;
    return Math.max(transitionDuration, animationDuration);
  };

  const dropdownListeners: Array<{
    toggle: HTMLElement;
    dropdown: HTMLElement | null;
    handlers: { [key: string]: EventListener };
  }> = [];

  dropdownToggles.forEach((toggle) => {
    const dropdownId = toggle.getAttribute('id');
    const dropdown = root.querySelector<HTMLElement>(`.nav-dropdown[id="${dropdownId}"]`);

    if (!dropdown) return;

    // Function to show the dropdown
    const showDropdown = async (targetDropdown: HTMLElement): Promise<void> => {
      if (activeDropdown !== null && activeDropdown !== targetDropdown && !isMobile()) {
        await hideDropdown(activeDropdown);
      }

      toggle.classList.add('active');

      if (!isMobile()) {
        if (contentElement !== null) {
          contentElement.classList.add('blur');
        }
        if (heroInnerContainerElement !== null) {
          heroInnerContainerElement.classList.add('blur');
        }
      }

      if (navElement) {
        navElement.style.borderColor = 'transparent';
      }

      if (isMobile()) {
        targetDropdown.classList.add('mobile-visible');
        targetDropdown.classList.remove('visible');
      } else {
        targetDropdown.classList.add('visible');
        targetDropdown.classList.remove('mobile-visible');
      }

      activeDropdown = targetDropdown;
    };

    // Function to hide the dropdown
    const hideDropdown = async (targetDropdown: HTMLElement): Promise<void> => {
      targetDropdown.classList.remove('mobile-visible');
      targetDropdown.classList.remove('visible');

      toggle.classList.remove('active');

      if (contentElement !== null) {
        contentElement.classList.remove('blur');
      }
      if (heroInnerContainerElement !== null) {
        heroInnerContainerElement.classList.remove('blur');
      }

      const animationDuration = getAnimationDuration(targetDropdown);

      if (!isMobile()) {
        await delay(animationDuration);
      }

      if (navElement) {
        navElement.style.borderColor = '';
      }
      activeDropdown = null;
    };

    const handlers: { [key: string]: EventListener } = {};

    if (isMobile()) {
      handlers.click = async (e: Event) => {
        e.preventDefault();
        if (dropdown.classList.contains('mobile-visible')) {
          await hideDropdown(dropdown);
        } else {
          await showDropdown(dropdown);
        }
      };
      toggle.addEventListener('click', handlers.click);
    } else {
      handlers.mouseenter = async () => {
        if (isMobile()) return;
        await showDropdown(dropdown);
      };

      handlers.mouseleave = async () => {
        if (isMobile()) return;
        if (!dropdown.matches(':hover')) {
          await hideDropdown(dropdown);
        }
      };

      const dropdownMouseleave = async () => {
        if (isMobile()) return;
        if (!toggle.matches(':hover')) {
          await hideDropdown(dropdown);
        }
      };

      toggle.addEventListener('mouseenter', handlers.mouseenter);
      toggle.addEventListener('mouseleave', handlers.mouseleave);
      dropdown.addEventListener('mouseleave', dropdownMouseleave);

      handlers.dropdownMouseleave = dropdownMouseleave;
    }

    dropdownListeners.push({ toggle, dropdown, handlers });
  });

  // Reset dropdown on window resize
  const resetDropdown = (): void => {
    dropdownToggles.forEach((toggle) => {
      const dropdownId = toggle.getAttribute('id');
      const targetDropdown = root.querySelector<HTMLElement>(`.nav-dropdown[id="${dropdownId}"]`);

      if (targetDropdown) {
        targetDropdown.classList.remove('mobile-visible');
        targetDropdown.classList.remove('visible');
      }
    });
  };

  const onResize = (): void => {
    resetDropdown();
    activeDropdown = null;
  };

  window.addEventListener('resize', onResize);

  // Teardown

  return () => {
    observer.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);

    if (scrollRAFId !== null) {
      cancelAnimationFrame(scrollRAFId);
    }

    dropdownListeners.forEach(({ toggle, dropdown, handlers }) => {
      if (handlers.click) {
        toggle.removeEventListener('click', handlers.click);
      }
      if (handlers.mouseenter) {
        toggle.removeEventListener('mouseenter', handlers.mouseenter);
      }
      if (handlers.mouseleave) {
        toggle.removeEventListener('mouseleave', handlers.mouseleave);
      }
      if (handlers.dropdownMouseleave && dropdown) {
        dropdown.removeEventListener('mouseleave', handlers.dropdownMouseleave);
      }
    });

    document.body.style.overflowX = '';
    document.body.style.overflowY = '';
  };
}
