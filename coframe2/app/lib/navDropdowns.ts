// Nav dropdown open/close behaviour.
// Ported from the page's inline dropdown script: hover on desktop, click on
// mobile, background blur on .content / .hero__inner-container while open, and the
// nav border going transparent for the duration.

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Longest of the element's transition/animation durations, in ms. */
export function getAnimationDuration(element: Element): number {
  const computed = window.getComputedStyle(element);
  const transitionDuration = parseFloat(computed.transitionDuration) * 1000;
  const animationDuration = parseFloat(computed.animationDuration) * 1000;
  return Math.max(
    Number.isFinite(transitionDuration) ? transitionDuration : 0,
    Number.isFinite(animationDuration) ? animationDuration : 0,
  );
}

export function initNavDropdowns(root: ParentNode = document): () => void {
  const dropdownToggles = Array.from(root.querySelectorAll('.nav__dropdown-toggle'));
  const heroInnerContainerElement = root.querySelector('.hero__inner-container');
  const contentElement = root.querySelector('.content');
  const navElement = root.querySelector('.nav');

  let activeDropdown: Element | null = null;
  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
  const cleanups: Array<() => void> = [];

  const dropdownFor = (toggle: Element): Element | null => {
    const id = toggle.getAttribute('id');
    if (!id) return null;
    return root.querySelector(`.nav-dropdown[id="${id}"]`);
  };

  for (const toggle of dropdownToggles) {
    const dropdown = dropdownFor(toggle);
    if (!dropdown) continue;

    const hideDropdown = async (target: Element): Promise<void> => {
      target.classList.remove('mobile-visible');
      target.classList.remove('visible');
      toggle.classList.remove('active');
      contentElement?.classList.remove('blur');
      heroInnerContainerElement?.classList.remove('blur');

      const animationDuration = getAnimationDuration(target);
      if (!isMobile()) await delay(animationDuration);

      if (navElement instanceof HTMLElement) navElement.style.borderColor = '';
      activeDropdown = null;
    };

    const showDropdown = async (target: Element): Promise<void> => {
      if (activeDropdown !== null && activeDropdown !== target && !isMobile()) {
        await hideDropdown(activeDropdown);
      }

      toggle.classList.add('active');

      if (!isMobile()) {
        contentElement?.classList.add('blur');
        heroInnerContainerElement?.classList.add('blur');
      }

      if (navElement instanceof HTMLElement) navElement.style.borderColor = 'transparent';

      if (isMobile()) {
        target.classList.add('mobile-visible');
        target.classList.remove('visible');
      } else {
        target.classList.add('visible');
        target.classList.remove('mobile-visible');
      }

      activeDropdown = target;
    };

    if (isMobile()) {
      const onClick = async () => {
        if (dropdown.classList.contains('mobile-visible')) await hideDropdown(dropdown);
        else await showDropdown(dropdown);
      };
      toggle.addEventListener('click', onClick);
      cleanups.push(() => toggle.removeEventListener('click', onClick));
    } else {
      const onToggleEnter = async () => {
        if (isMobile()) return;
        await showDropdown(dropdown);
      };
      const onToggleLeave = async () => {
        if (isMobile()) return;
        if (!dropdown.matches(':hover')) await hideDropdown(dropdown);
      };
      const onDropdownLeave = async () => {
        if (isMobile()) return;
        if (!toggle.matches(':hover')) await hideDropdown(dropdown);
      };
      toggle.addEventListener('mouseenter', onToggleEnter);
      toggle.addEventListener('mouseleave', onToggleLeave);
      dropdown.addEventListener('mouseleave', onDropdownLeave);
      cleanups.push(() => {
        toggle.removeEventListener('mouseenter', onToggleEnter);
        toggle.removeEventListener('mouseleave', onToggleLeave);
        dropdown.removeEventListener('mouseleave', onDropdownLeave);
      });
    }
  }

  const resetDropdown = () => {
    for (const toggle of dropdownToggles) {
      const dropdown = dropdownFor(toggle);
      dropdown?.classList.remove('mobile-visible');
      dropdown?.classList.remove('visible');
    }
  };

  const onResize = () => {
    resetDropdown();
    activeDropdown = null;
  };
  window.addEventListener('resize', onResize);

  return () => {
    cleanups.forEach((fn) => fn());
    window.removeEventListener('resize', onResize);
  };
}
