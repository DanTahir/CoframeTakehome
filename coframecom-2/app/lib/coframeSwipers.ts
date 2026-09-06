/**
 * Coframe Swipers initialization.
 *
 * Ports the inline carousel and tabbed stepper logic from scrape/analysis/script-28.js.
 * Initializes three Swiper carousels (variants, case-studies, and introduction tabs)
 * and implements the Introduction section's tab autoplay with mobile menu and hover pause.
 *
 * CRITICAL HAZARD: The introduction tab controls are `<a>` anchors with `href="#..."`.
 * A previous version called `.click()` on these during autoplay, which triggered default
 * anchor navigation and force-scrolled the viewport back to the Introduction section,
 * making the page unusable. THIS VERSION PREVENTS THAT:
 *
 * 1. User clicks on tab anchors call preventDefault() to stop anchor navigation.
 * 2. Autoplay bypasses .click() entirely and calls the internal activateTab() function
 *    directly, which updates the DOM without any scroll side effects.
 * 3. No scrollIntoView(), no location.hash, no window.scrollTo() anywhere in this module.
 *
 * The Swiper library is dynamically imported to avoid SSR issues, which makes the init
 * function async internally. The public API returns a Teardown synchronously via a
 * closure that collects instances and clears them on unmount.
 */

import type { Teardown } from './runtime';
import { $all, prefersReducedMotion } from './runtime';

/**
 * Initializes all Coframe Swiper instances: variants carousel, case-studies carousel,
 * and the introduction section carousel with tabbed stepper and autoplay.
 *
 * Returns a teardown function that destroys all Swipers and cancels all timers/observers.
 * If the component unmounts before the async Swiper import completes, the teardown
 * sets a cancelled flag so the import doesn't spawn an orphan instance.
 */
export function initCoframeSwipers(root: ParentNode = document): Teardown | void {
  // Closure state: collected instances and cancellation flag for async cleanup.
  const instances: Array<{ destroy: (deleteStyles: boolean, deleteEl: boolean) => void }> = [];
  let cancelled = false;

  // Kick off async Swiper import. The returned teardown will clean up whatever exists by then.
  void (async () => {
    if (cancelled) return;
    const { default: Swiper } = await import('swiper/bundle');
    if (cancelled) return;

    // ========== Swiper 1: .swiper.swiper-variants (horizontal scroll carousel) ==========
    const swiper1Element = root.querySelector('.swiper.swiper-variants');
    if (swiper1Element) {
      const swiper1 = new Swiper('.swiper.swiper-variants', {
        loop: false,
        centeredSlides: false,
        slidesPerView: 'auto',
        slidesOffsetBefore: 32,
        slidesOffsetAfter: 32,
        keyboard: {
          enabled: true,
        },
        mousewheel: {
          forceToAxis: true,
          releaseOnEdges: true,
          sensitivity: 1,
          thresholdDelta: 20,
        },
        breakpoints: {
          992: {
            spaceBetween: 24,
          },
          768: {
            spaceBetween: 24,
          },
          479: {
            spaceBetween: 16,
          },
          320: {
            spaceBetween: 16,
          },
        },
      });
      instances.push(swiper1);
    }

    // ========== Swiper 2: .swiper.swiper-case-studies (creative effect carousel) ==========
    // Clone all case-study slides before initializing the Swiper (simulates looping content).
    const caseStudiesWrapper = root.querySelector('.swiper-wrapper.cc-case-studies');
    if (caseStudiesWrapper) {
      const caseStudyItems = Array.from(caseStudiesWrapper.children);
      caseStudyItems.forEach((item) => {
        const clone = item.cloneNode(true);
        caseStudiesWrapper.appendChild(clone);
      });
    }

    const swiper2Element = root.querySelector('.swiper.swiper-case-studies');
    if (swiper2Element) {
      const originalScale = 0.85;
      const originalOpacity = 0.25;

      const swiper2 = new Swiper('.swiper.swiper-case-studies', {
        initialSlide: 0,
        slidesPerView: 2,
        watchSlidesProgress: true,
        loop: true,
        speed: 400,
        keyboard: {
          enabled: true,
        },
        freeMode: false,
        shortSwipes: false,
        longSwipes: false,
        centeredSlides: true,
        slideToClickedSlide: true,
        spaceBetween: 0,
        grabCursor: true,
        effect: 'creative',
        creativeEffect: {
          limitProgress: 2,
          prev: {
            opacity: originalOpacity,
            scale: originalScale,
            translate: ['-100%', 0, 0],
          },
          next: {
            opacity: originalOpacity,
            scale: originalScale,
            translate: ['100%', 0, 0],
          },
        },
        breakpoints: {
          992: {
            slidesPerView: 2,
            mousewheel: {
              forceToAxis: true,
              releaseOnEdges: true,
              sensitivity: 2,
              thresholdDelta: 5,
            },
            resistanceRatio: 0.2,
            touchRatio: 1.5,
            longSwipesRatio: 0.2,
          },
          768: {
            slidesPerView: 1.5,
            mousewheel: {
              forceToAxis: true,
              releaseOnEdges: true,
              sensitivity: 2,
              thresholdDelta: 5,
            },
            resistanceRatio: 0.3,
            touchRatio: 1.5,
            longSwipesRatio: 0.3,
          },
          479: {
            slidesPerView: 1.125,
            mousewheel: {
              forceToAxis: true,
              releaseOnEdges: true,
              sensitivity: 0.5,
              thresholdDelta: 5,
            },
            resistanceRatio: 0.5,
            touchRatio: 1.5,
            longSwipesRatio: 0.3,
          },
          320: {
            slidesPerView: 1.125,
            mousewheel: {
              forceToAxis: true,
              releaseOnEdges: true,
              sensitivity: 0.5,
              thresholdDelta: 5,
            },
            resistanceRatio: 0.5,
            touchRatio: 1.5,
            longSwipesRatio: 0.3,
          },
        },
        on: {
          setTranslate: function (swiper: any) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            swiper.slides.forEach((slide: any) => {
              const elements = slide.querySelectorAll(
                '*:not(.case-study-card__bg-image)'
              );

              if (elements && elements.length > 0) {
                // Clamp progress to [-1, 1] and apply opacity/bg color based on position.
                let progress = slide.progress;
                progress = Math.min(Math.max(progress, -1), 1);

                const raw = Math.sign(slide.progress) * Math.min(Math.abs(slide.progress), 1);

                const opacity = 1 - Math.abs(raw);
                const bgOpacity = 1 - 0.7 * Math.abs(raw);

                elements.forEach((el: HTMLElement) => {
                  el.style.opacity = `${opacity}`;
                });

                slide.style.backgroundColor = `rgba(0, 0, 0, ${bgOpacity})`;
              }
            });
          },
        },
      });
      instances.push(swiper2);
      swiper2.slideToLoop(0, 0);
    }

    // ========== Swiper 3: .introduction.swiper (tabbed stepper with autoplay) ==========
    const introElement = root.querySelector('.introduction.swiper');
    if (introElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const swiper3Config: any = {
        keyboard: {
          enabled: true,
        },
        mousewheel: {
          forceToAxis: true,
          releaseOnEdges: true,
          sensitivity: 1,
          thresholdDelta: 20,
        },
        breakpoints: {
          992: {
            slidesPerView: '3',
            spaceBetween: 96,
            centeredSlides: false,
            allowTouchMove: true,
          },
          768: {
            slidesPerView: '2',
            spaceBetween: 48,
            centeredSlides: true,
            allowTouchMove: true,
          },
          479: {
            slidesPerView: '1.5',
            spaceBetween: 32,
            centeredSlides: true,
            allowTouchMove: true,
          },
          320: {
            slidesPerView: '1.5',
            spaceBetween: 32,
            centeredSlides: true,
            allowTouchMove: true,
          },
        },
        wrapperClass: 'introduction__steps',
      };
      const swiper3 = new Swiper('.introduction.swiper', swiper3Config);
      instances.push(swiper3);

      // NOTE: `initCoframeIntroTabs` is deliberately NOT called here.
      // ClientRuntime registers it as its own effect, so calling it from this
      // function too would initialise the tab engine TWICE: two independent
      // sets of click handlers and two competing 4s autoplay timers, each with
      // its own `currentTab`. The symptom is a tab that refuses to stay
      // selected — you click step 2, the other closure's timer fires and
      // activates whatever index IT thinks is next. The discarded return value
      // also leaked that second timer past teardown.
    }
  })();

  // Return synchronous teardown that clears everything and sets cancelled flag for async path.
  return () => {
    cancelled = true;
    for (const instance of instances) {
      instance.destroy(true, true);
    }
  };
}

/**
 * Initializes the Introduction section's tabbed stepper with autoplay.
 *
 * Manages tab switching, autoplay (with mobile menu and hover pause), and the
 * Intersection Observer that starts autoplay when the section scrolls into view.
 *
 * CRITICAL: Tab clicks are guarded with preventDefault() to prevent anchor navigation.
 * Autoplay does NOT use .click() — it calls activateTab() directly to avoid any
 * scroll side effects.
 */
export function initCoframeIntroTabs(root: ParentNode = document): Teardown | void {
  // Collect all cleanup callbacks to call in teardown.
  const cleanups: Array<() => void> = [];

  const tabs = $all<HTMLAnchorElement>('.introduction__step', root);
  const tabContents = $all<HTMLElement>('.introduction .w-tab-content .w-tab-pane', root);
  const swiperTabsContainer = root.querySelector('.introduction.swiper .swiper-wrapper');
  const introSwiperElement = root.querySelector('.introduction.swiper');
  const mobileNavMenu = root.querySelector('.w-nav-menu');

  // Guard: if key elements don't exist, exit silently.
  if (tabs.length === 0 || tabContents.length === 0 || !introSwiperElement) {
    return;
  }

  /**
   * Internal function: activate a tab by index.
   * Updates the DOM (class toggles) but does NOT scroll and does NOT call .click().
   * This is the safe path used by autoplay.
   */
  function activateTab(index: number): void {
    tabs.forEach((tab, i) => {
      if (i === index) {
        tab.classList.add('w--current');
      } else {
        tab.classList.remove('w--current');
      }
    });

    tabContents.forEach((content, i) => {
      if (i === index) {
        content.classList.add('w--tab-active');
      } else {
        content.classList.remove('w--tab-active');
      }
    });
  }

  // Attempt to get the Swiper instance (will exist by the time user interacts).
  // Since Swiper is dynamically imported above, we query for it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let swiper3: any = null;

  // Try to find the Swiper instance by its DOM attachment.
  const getSwiperInstance = (): any => {
    if (!swiper3) {
      const swiperEl = root.querySelector('.introduction.swiper') as any;
      if (swiperEl && swiperEl.swiper) {
        swiper3 = swiperEl.swiper;
      }
    }
    return swiper3;
  };

  // Autoplay state.
  let autoplayTimeout: ReturnType<typeof setTimeout> | null = null;
  const autoplayDelay = 4000; // 4 seconds
  let remainingTime = autoplayDelay;
  let autoplayStart = Date.now();
  let currentTab = 0;
  let swiper3AutoplayStarted = false;
  const reduceMotion = prefersReducedMotion();

  /**
   * Activate a tab and sync the Swiper carousel.
   * Called by both user clicks and autoplay, but with different handlers to guard against scrolls.
   */
  function syncTabToSwiper(index: number): void {
    activateTab(index);
    currentTab = index;
    const swiper = getSwiperInstance();
    // Only drive the carousel when it can actually move. On this page the
    // intro Swiper is configured `slidesPerView: '3'` with exactly 3 slides
    // (so `allowSlideNext` is false and `realIndex` is permanently 0) — the
    // steps are all visible at once and the tabs are the real control. Calling
    // slideTo() on it is not just useless: the clamped move still emits
    // `slideChange`, whose handler would re-activate index 0 and instantly
    // undo the tab the user just picked.
    if (swiper && swiperCanSlide()) {
      swiper.slideTo(index, 300);
    }
  }

  /**
   * True only when the carousel has more slides than it shows at once, i.e.
   * when sliding is physically possible and `realIndex` is meaningful.
   */
  function swiperCanSlide(): boolean {
    const swiper = getSwiperInstance();
    if (!swiper || !swiper.slides) return false;
    const raw = swiper.params?.slidesPerView;
    const perView = typeof raw === 'number' ? raw : Number.parseFloat(String(raw));
    if (!Number.isFinite(perView)) return true; // e.g. 'auto' — let Swiper decide
    return swiper.slides.length > perView;
  }

  /**
   * Add event listeners to all tabs.
   * User clicks call preventDefault() to block anchor navigation, then update the tab.
   */
  tabs.forEach((tab, index) => {
    const handler = (event: Event) => {
      // Prevent default anchor navigation (the critical bug fix).
      event.preventDefault();
      // Clear autoplay timer and reset it when user clicks.
      if (autoplayTimeout !== null) {
        clearTimeout(autoplayTimeout);
      }
      remainingTime = autoplayDelay;
      syncTabToSwiper(index);
      // Restart autoplay after user interaction.
      startAutoplay();
    };
    tab.addEventListener('click', handler);
    cleanups.push(() => tab.removeEventListener('click', handler));
  });

  /**
   * Listen for Swiper slide changes (user swipe/keyboard navigation).
   * Update the current tab index to keep in sync.
   */
  const setupSwiperListener = () => {
    const swiper = getSwiperInstance();
    if (swiper) {
      const handleSlideChange = () => {
        // Ignore slide changes from a carousel that cannot really slide: its
        // realIndex is stuck at 0, so honouring it here would fight the tab
        // that a click (or autoplay) just activated.
        if (!swiperCanSlide()) return;
        currentTab = swiper.realIndex;
        activateTab(currentTab);
      };
      swiper.on('slideChange', handleSlideChange);
      cleanups.push(() => swiper.off('slideChange', handleSlideChange));
    }
  };

  // Try to set up the Swiper listener immediately; if it hasn't been created yet,
  // defer it until after the async import completes (a small setTimeout).
  setupSwiperListener();
  const deferredSetup = setTimeout(() => {
    setupSwiperListener();
  }, 100);
  cleanups.push(() => clearTimeout(deferredSetup));

  function startAutoplay(): void {
    if (reduceMotion || swiper3AutoplayStarted === false) {
      // Don't start autoplay if prefers-reduced-motion is set or if the section hasn't come into view.
      return;
    }

    // Remove pause class from tabs.
    tabs.forEach((tab) => {
      tab.classList.remove('cc-animation-paused');
    });

    // Clear any existing timeout.
    if (autoplayTimeout !== null) {
      clearTimeout(autoplayTimeout);
    }

    // Record start time for pause/resume tracking.
    autoplayStart = Date.now();

    // Set the next autoplay trigger.
    autoplayTimeout = setTimeout(() => {
      // Move to next tab, wrapping around.
      currentTab = (currentTab + 1) % tabs.length;

      // Activate the tab WITHOUT calling .click() to avoid anchor navigation.
      syncTabToSwiper(currentTab);

      // Reset timing and restart autoplay.
      remainingTime = autoplayDelay;
      startAutoplay();
    }, remainingTime);
  }

  function stopAutoplay(): void {
    // Add pause class to tabs.
    tabs.forEach((tab) => {
      tab.classList.add('cc-animation-paused');
    });

    // Calculate elapsed time since autoplay started.
    const elapsed = Date.now() - autoplayStart;

    // Update remaining time, clamping to prevent negatives.
    remainingTime = Math.max(remainingTime - elapsed, 0);

    // Clear the timeout.
    if (autoplayTimeout !== null) {
      clearTimeout(autoplayTimeout);
      autoplayTimeout = null;
    }
  }

  /**
   * Intersection Observer: start autoplay when the intro section scrolls into view.
   * This defers autoplay until the user has scrolled down to see the Introduction.
   */
  if (introSwiperElement) {
    const observerOptions = {
      root: null, // Use viewport as root.
      threshold: 0.5, // Trigger when 50% of the section is visible.
    };

    const swiperObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !swiper3AutoplayStarted) {
          swiper3AutoplayStarted = true;
          startAutoplay();
        }
      });
    }, observerOptions);

    swiperObserver.observe(introSwiperElement);
    cleanups.push(() => swiperObserver.disconnect());
  }

  /**
   * Pause autoplay when the mobile menu opens, resume when it closes.
   * Watches the data-nav-menu-open attribute for changes.
   */
  if (mobileNavMenu) {
    const handleMobileMenuMutation = (mutations: MutationRecord[]) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-nav-menu-open') {
          const isMobileNavOpen = mobileNavMenu.hasAttribute('data-nav-menu-open');
          if (isMobileNavOpen) {
            stopAutoplay();
          } else {
            startAutoplay();
          }
        }
      });
    };

    const menuObserver = new MutationObserver(handleMobileMenuMutation);
    menuObserver.observe(mobileNavMenu, { attributes: true });
    cleanups.push(() => menuObserver.disconnect());
  }

  /**
   * Pause autoplay on hover over the tabs container, resume on leave.
   * This prevents the carousel from auto-advancing while the user is focused on it.
   */
  if (swiperTabsContainer) {
    const handleMouseEnter = () => stopAutoplay();
    const handleMouseLeave = () => startAutoplay();

    swiperTabsContainer.addEventListener('mouseenter', handleMouseEnter);
    swiperTabsContainer.addEventListener('mouseleave', handleMouseLeave);

    cleanups.push(() => {
      swiperTabsContainer.removeEventListener('mouseenter', handleMouseEnter);
      swiperTabsContainer.removeEventListener('mouseleave', handleMouseLeave);
    });
  }

  // Return a combined teardown that clears all listeners, observers, and timers.
  return () => {
    if (autoplayTimeout !== null) {
      clearTimeout(autoplayTimeout);
      autoplayTimeout = null;
    }
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
