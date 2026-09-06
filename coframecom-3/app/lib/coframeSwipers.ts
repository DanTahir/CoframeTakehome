/**
 * Swiper carousel and Introduction step-tab engine.
 *
 * Ports the original coframe.com inline script's three Swiper instances:
 *  1. .swiper.swiper-variants (if it exists in markup)
 *  2. .swiper.swiper-case-studies (creative carousel with fade/scale effects)
 *  3. .introduction.swiper (tab-driven step carousel with 4-second autoplay)
 *
 * The markup only contains instances 2 and 3; instance 1 is a no-op if absent.
 * Dynamically imports Swiper 11 so a missing library degrades gracefully.
 * No-op silently if no Swiper roots exist.
 */

import { type EffectInit, type Teardown } from './runtime';

type AnyModule = any;

/**
 * Initializes all three Swiper instances (where present in the DOM) and the
 * Introduction step-tab engine. Returns a single teardown that destroys all
 * instances and clears all timers and listeners.
 *
 * @param root The root element to search for Swiper containers (default: document)
 * @returns A teardown function, or undefined if no Swipers were found
 */
export const initCoframeSwipers: EffectInit = (root: ParentNode = document): Teardown | void => {
  // Check if any Swiper roots exist before loading the library
  const hasSwiper1 = root.querySelector('.swiper.swiper-variants');
  const hasSwiper2 = root.querySelector('.swiper.swiper-case-studies');
  const hasSwiper3 = root.querySelector('.introduction.swiper');

  if (!hasSwiper1 && !hasSwiper2 && !hasSwiper3) {
    return; // No-op: no Swipers to initialize
  }

  let disposed = false;
  const instances: AnyModule[] = [];
  const timers: NodeJS.Timeout[] = [];
  const listeners: Array<{ el: EventTarget; event: string; handler: EventListener }> = [];
  const observers: Array<IntersectionObserver | MutationObserver> = [];

  void (async () => {
    if (disposed) return;

    try {
      const mod = await import('swiper/bundle');
      if (disposed) return;

      const Swiper = mod.Swiper || mod.default;
      if (typeof Swiper !== 'function') {
        console.warn('[replica] Swiper not found in swiper/bundle');
        return;
      }

      // Initialize Swiper 1: .swiper.swiper-variants
      if (hasSwiper1) {
        const el = root.querySelector('.swiper.swiper-variants') as HTMLElement;
        if (el) {
          try {
            instances.push(
              new Swiper(el, {
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
              }),
            );
          } catch (err) {
            console.warn('[replica] Swiper variants failed to initialise:', err);
          }
        }
      }

      // Initialize Swiper 2: .swiper.swiper-case-studies
      if (hasSwiper2) {
        const el = root.querySelector('.swiper.swiper-case-studies') as HTMLElement;
        if (el) {
          try {
            // Clone slides for loop effect (from original script)
            const wrapper = root.querySelector('.swiper-wrapper.cc-case-studies') as HTMLElement;
            if (wrapper) {
              const originalSlides = Array.from(wrapper.children) as HTMLElement[];
              originalSlides.forEach((slide) => {
                const clone = slide.cloneNode(true) as HTMLElement;
                wrapper.appendChild(clone);
              });
            }

            const swiper2 = new Swiper(el, {
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
              effect: 'creative' as const,
              creativeEffect: {
                limitProgress: 2,
                prev: {
                  opacity: 0.25,
                  scale: 0.85,
                  translate: ['-100%', 0, 0],
                },
                next: {
                  opacity: 0.25,
                  scale: 0.85,
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
                setTranslate: function (swiper: AnyModule) {
                  swiper.slides.forEach((slide: HTMLElement & { progress?: number }) => {
                    const elements = slide.querySelectorAll('*:not(.case-study-card__bg-image)');

                    if (elements.length > 0) {
                      let progress = slide.progress ?? 0;
                      progress = Math.min(Math.max(progress, -1), 1);

                      const raw = Math.sign(slide.progress ?? 0) * Math.min(Math.abs(slide.progress ?? 0), 1);

                      const opacity = 1 - Math.abs(raw);
                      const bgOpacity = 1 - 0.7 * Math.abs(raw);

                      elements.forEach((el: Element) => {
                        (el as HTMLElement).style.opacity = opacity.toString();
                      });

                      slide.style.backgroundColor = `rgba(0, 0, 0, ${bgOpacity})`;
                    }
                  });
                },
              },
            });

            instances.push(swiper2);
            swiper2.slideToLoop(0, 0);
          } catch (err) {
            console.warn('[replica] Swiper case-studies failed to initialise:', err);
          }
        }
      }

      // Initialize Swiper 3: .introduction.swiper (with tab engine and autoplay)
      if (hasSwiper3) {
        const el = root.querySelector('.introduction.swiper') as HTMLElement;
        if (el) {
          try {
            const swiper3 = new Swiper(el, {
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
                  slidesPerView: 3,
                  spaceBetween: 96,
                  centeredSlides: false,
                  allowTouchMove: true,
                },
                768: {
                  slidesPerView: 2,
                  spaceBetween: 48,
                  centeredSlides: true,
                  allowTouchMove: true,
                },
                479: {
                  slidesPerView: 1.5,
                  spaceBetween: 32,
                  centeredSlides: true,
                  allowTouchMove: true,
                },
                320: {
                  slidesPerView: 1.5,
                  spaceBetween: 32,
                  centeredSlides: true,
                  allowTouchMove: true,
                },
              },
              wrapperClass: 'introduction__steps',
            });

            instances.push(swiper3);

            // Initialize the Introduction step-tab engine
            initIntroductionTabs(root, swiper3, timers, listeners, observers);
          } catch (err) {
            console.warn('[replica] Swiper introduction failed to initialise:', err);
          }
        }
      }
    } catch (err) {
      console.warn('[replica] Swiper library not installed — carousels will render statically.', err);
    }
  })();

  // Return a single teardown function that cleans up all instances
  return () => {
    disposed = true;

    // Destroy all Swiper instances
    for (const inst of instances) {
      try {
        inst.destroy?.(true, true);
      } catch {
        /* best-effort */
      }
    }

    // Clear all timers
    for (const timer of timers) {
      clearTimeout(timer);
    }

    // Remove all listeners
    for (const { el, event, handler } of listeners) {
      try {
        el.removeEventListener(event, handler);
      } catch {
        /* best-effort */
      }
    }

    // Disconnect all observers
    for (const observer of observers) {
      try {
        observer.disconnect();
      } catch {
        /* best-effort */
      }
    }
  };
};

/**
 * Internal function to initialize the Introduction step-tab engine.
 * Handles tab/pane synchronization, 4-second autoplay, intersection observer,
 * mobile menu detection, and hover pause.
 *
 * Tab clicks call preventDefault() to suppress the href-based fragment navigation
 * that would otherwise occur (replacing the removed webflow.js).
 */
function initIntroductionTabs(
  root: ParentNode,
  swiper3: AnyModule,
  timers: NodeJS.Timeout[],
  listeners: Array<{ el: EventTarget; event: string; handler: EventListener }>,
  observers: Array<IntersectionObserver | MutationObserver>,
): void {
  const tabs = root.querySelectorAll('.introduction__step');
  const tabContents = root.querySelectorAll('.introduction .w-tab-content .w-tab-pane');
  const swiperTabsContainer = root.querySelector('.introduction.swiper .swiper-wrapper');

  if (!tabs.length || !tabContents.length) return;

  // State for autoplay
  let autoplayTimeout: NodeJS.Timeout | null = null;
  const autoplayDelay = 4000; // 4 seconds
  let remainingTime = autoplayDelay;
  let autoplayStart: number;
  let currentTab = 0;

  /**
   * Set the active tab and show the relevant content.
   * Toggles .w--current on tabs and .w--tab-active on panes.
   */
  function setActiveTab(index: number): void {
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

  /**
   * Start or restart the autoplay timer.
   */
  function startAutoplay(): void {
    tabs.forEach((tab) => {
      tab.classList.remove('cc-animation-paused');
    });

    if (autoplayTimeout !== null) {
      clearTimeout(autoplayTimeout);
    }

    autoplayStart = Date.now();

    const timeout = setTimeout(() => {
      currentTab = (currentTab + 1) % tabs.length;
      const tabEl = tabs[currentTab] as HTMLElement;
      if (tabEl) {
        tabEl.click();
      }
      remainingTime = autoplayDelay;
      startAutoplay();
    }, remainingTime);

    autoplayTimeout = timeout;
    timers.push(timeout);
  }

  /**
   * Stop the autoplay timer and mark tabs as paused.
   */
  function stopAutoplay(): void {
    tabs.forEach((tab) => {
      tab.classList.add('cc-animation-paused');
    });

    const elapsed = Date.now() - autoplayStart;
    remainingTime = Math.max(remainingTime - elapsed, 0);

    if (autoplayTimeout !== null) {
      clearTimeout(autoplayTimeout);
      autoplayTimeout = null;
    }
  }

  // Add click handlers to tabs (MUST call preventDefault)
  tabs.forEach((tab, index) => {
    const clickHandler = (e: Event) => {
      e.preventDefault(); // Suppress href-based fragment navigation

      setActiveTab(index);
      swiper3.slideTo(index, 300);
      currentTab = index;

      // Reset autoplay when a tab is clicked
      if (autoplayTimeout !== null) {
        clearTimeout(autoplayTimeout);
      }
      remainingTime = autoplayDelay;
      startAutoplay();
    };

    tab.addEventListener('click', clickHandler);
    listeners.push({ el: tab, event: 'click', handler: clickHandler });
  });

  // Listen for Swiper slide changes
  const slideChangeHandler = () => {
    const activeIndex = swiper3.realIndex;
    currentTab = activeIndex;
    setActiveTab(activeIndex);
  };
  swiper3.on('slideChange', slideChangeHandler);

  // Intersection Observer to start autoplay when Swiper comes into view
  let swiper3AutoplayStarted = false;
  const swiper3Element = root.querySelector('.introduction.swiper') as HTMLElement;

  if (swiper3Element) {
    const swiper3Observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !swiper3AutoplayStarted) {
          startAutoplay();
          swiper3AutoplayStarted = true;
        }
      });
    }, {
      root: null,
      threshold: 0.5,
    });

    swiper3Observer.observe(swiper3Element);
    observers.push(swiper3Observer);
  }

  // Detect mobile menu state and pause/resume autoplay
  const mobileNavMenu = root.querySelector('.w-nav-menu') as HTMLElement;
  if (mobileNavMenu) {
    const mutationObserver = new MutationObserver((mutations) => {
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
    });

    mutationObserver.observe(mobileNavMenu, {
      attributes: true,
    });
    observers.push(mutationObserver);
  }

  // Pause autoplay when hovering over the swiper tabs container
  if (swiperTabsContainer) {
    const mouseEnterHandler = () => stopAutoplay();
    const mouseLeaveHandler = () => startAutoplay();

    swiperTabsContainer.addEventListener('mouseenter', mouseEnterHandler);
    swiperTabsContainer.addEventListener('mouseleave', mouseLeaveHandler);
    listeners.push({ el: swiperTabsContainer, event: 'mouseenter', handler: mouseEnterHandler });
    listeners.push({ el: swiperTabsContainer, event: 'mouseleave', handler: mouseLeaveHandler });
  }
}
