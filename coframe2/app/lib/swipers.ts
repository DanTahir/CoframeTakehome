// The page's three Swiper instances plus the "how it works" tab autoplay.
// Ported from the page's inline swiper script. Uses the npm swiper package with
// only the modules the original config needs.
import Swiper from 'swiper';
import { EffectCreative, Keyboard, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper';

export const ORIGINAL_SCALE = 0.85;
export const ORIGINAL_OPACITY = 0.25;
export const AUTOPLAY_DELAY = 4000;

export interface SwiperBundle {
  variants?: SwiperInstance;
  caseStudies?: SwiperInstance;
  introduction?: SwiperInstance;
  destroy: () => void;
}

/** Duplicates the case-study slides once, as the original does, for the loop. */
export function duplicateCaseStudySlides(root: ParentNode = document): void {
  const caseStudiesWrapper = root.querySelector('.swiper-wrapper.cc-case-studies');
  if (!caseStudiesWrapper) return;
  if (caseStudiesWrapper.getAttribute('data-duplicated') === 'true') return;

  Array.from(caseStudiesWrapper.children).forEach((item) => {
    caseStudiesWrapper.appendChild(item.cloneNode(true));
  });
  caseStudiesWrapper.setAttribute('data-duplicated', 'true');
}

export function initSwipers(root: ParentNode = document): SwiperBundle {
  const cleanups: Array<() => void> = [];
  const bundle: SwiperBundle = { destroy: () => cleanups.forEach((fn) => fn()) };

  // ---- 1. Variants strip -------------------------------------------------
  if (root.querySelector('.swiper.swiper-variants')) {
    bundle.variants = new Swiper('.swiper.swiper-variants', {
      modules: [Keyboard, Mousewheel],
      loop: false,
      centeredSlides: false,
      slidesPerView: 'auto',
      slidesOffsetBefore: 32,
      slidesOffsetAfter: 32,
      keyboard: { enabled: true },
      mousewheel: {
        forceToAxis: true,
        releaseOnEdges: true,
        sensitivity: 1,
        thresholdDelta: 20,
      },
      breakpoints: {
        992: { spaceBetween: 24 },
        768: { spaceBetween: 24 },
        479: { spaceBetween: 16 },
        320: { spaceBetween: 16 },
      },
    });
  }

  // ---- 2. Case studies carousel -----------------------------------------
  duplicateCaseStudySlides(root);

  if (root.querySelector('.swiper.swiper-case-studies')) {
    const caseStudies = new Swiper('.swiper.swiper-case-studies', {
      modules: [Keyboard, Mousewheel, EffectCreative],
      initialSlide: 0,
      slidesPerView: 2,
      watchSlidesProgress: true,
      speed: 400,
      keyboard: { enabled: true },
      freeMode: false,
      shortSwipes: false,
      longSwipes: false,
      centeredSlides: true,
      slideToClickedSlide: true,
      loop: true,
      spaceBetween: 0,
      grabCursor: true,
      effect: 'creative',
      creativeEffect: {
        limitProgress: 2,
        prev: {
          opacity: ORIGINAL_OPACITY,
          scale: ORIGINAL_SCALE,
          translate: ['-100%', 0, 0],
        },
        next: {
          opacity: ORIGINAL_OPACITY,
          scale: ORIGINAL_SCALE,
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
        // Cross-fades the off-centre cards and darkens their backing.
        setTranslate: (swiper) => {
          swiper.slides.forEach((slide) => {
            const elements = slide.querySelectorAll('*:not(.case-study-card__bg-image)');
            if (!elements.length) return;

            const slideProgress = (slide as HTMLElement & { progress: number }).progress;
            const raw = Math.sign(slideProgress) * Math.min(Math.abs(slideProgress), 1);
            const opacity = 1 - Math.abs(raw);
            const bgOpacity = 1 - 0.7 * Math.abs(raw);

            elements.forEach((el) => {
              if (el instanceof HTMLElement) el.style.opacity = String(opacity);
            });
            if (slide instanceof HTMLElement) {
              slide.style.backgroundColor = `rgba(0, 0, 0, ${bgOpacity})`;
            }
          });
        },
      },
    });
    caseStudies.slideToLoop(0, 0);
    bundle.caseStudies = caseStudies;
  }

  // ---- 3. Introduction ("how it works") steps + tab autoplay -------------
  const swiper3Element = root.querySelector('.introduction.swiper');
  if (swiper3Element) {
    const introduction = new Swiper('.introduction.swiper', {
      modules: [Keyboard, Mousewheel],
      keyboard: { enabled: true },
      mousewheel: {
        forceToAxis: true,
        releaseOnEdges: true,
        sensitivity: 1,
        thresholdDelta: 20,
      },
      breakpoints: {
        992: { slidesPerView: 3, spaceBetween: 96, centeredSlides: false, allowTouchMove: true },
        768: { slidesPerView: 2, spaceBetween: 48, centeredSlides: true, allowTouchMove: true },
        479: { slidesPerView: 1.5, spaceBetween: 32, centeredSlides: true, allowTouchMove: true },
        320: { slidesPerView: 1.5, spaceBetween: 32, centeredSlides: true, allowTouchMove: true },
      },
      wrapperClass: 'introduction__steps',
    });
    bundle.introduction = introduction;

    const tabs = Array.from(root.querySelectorAll('.introduction__step'));
    const tabContents = Array.from(
      root.querySelectorAll('.introduction .w-tab-content .w-tab-pane'),
    );
    const swiperTabsContainer = root.querySelector('.introduction.swiper .swiper-wrapper');

    const setActiveTab = (index: number) => {
      tabs.forEach((tab, i) => tab.classList.toggle('w--current', i === index));
      tabContents.forEach((content, i) => content.classList.toggle('w--tab-active', i === index));
    };

    let autoplayTimeout: ReturnType<typeof setTimeout> | undefined;
    let remainingTime = AUTOPLAY_DELAY;
    let autoplayStart = 0;
    let currentTab = 0;

    const startAutoplay = () => {
      tabs.forEach((tab) => tab.classList.remove('cc-animation-paused'));
      if (autoplayTimeout) clearTimeout(autoplayTimeout);
      autoplayStart = Date.now();
      autoplayTimeout = setTimeout(() => {
        currentTab = (currentTab + 1) % Math.max(tabs.length, 1);
        (tabs[currentTab] as HTMLElement | undefined)?.click();
        remainingTime = AUTOPLAY_DELAY;
        startAutoplay();
      }, remainingTime);
    };

    const stopAutoplay = () => {
      tabs.forEach((tab) => tab.classList.add('cc-animation-paused'));
      const elapsed = Date.now() - autoplayStart;
      remainingTime = Math.max(remainingTime - elapsed, 0);
      if (autoplayTimeout) clearTimeout(autoplayTimeout);
    };

    const tabClickHandlers: Array<[Element, () => void]> = [];
    tabs.forEach((tab, index) => {
      const onClick = () => {
        setActiveTab(index);
        introduction.slideTo(index, 300);
        currentTab = index;
        if (autoplayTimeout) clearTimeout(autoplayTimeout);
        remainingTime = AUTOPLAY_DELAY;
        startAutoplay();
      };
      tab.addEventListener('click', onClick);
      tabClickHandlers.push([tab, onClick]);
    });

    introduction.on('slideChange', () => {
      const activeIndex = introduction.realIndex;
      currentTab = activeIndex;
      setActiveTab(activeIndex);
    });

    // Autoplay only starts once the section scrolls into view.
    let autoplayStarted = false;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !autoplayStarted) {
            startAutoplay();
            autoplayStarted = true;
          }
        });
      },
      { root: null, threshold: 0.5 },
    );
    observer.observe(swiper3Element);

    // Pause while the mobile menu is open.
    const mobileNavMenu = root.querySelector('.w-nav-menu');
    const menuObserver = mobileNavMenu
      ? new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.attributeName !== 'data-nav-menu-open') return;
            if (mobileNavMenu.hasAttribute('data-nav-menu-open')) stopAutoplay();
            else startAutoplay();
          });
        })
      : null;
    menuObserver?.observe(mobileNavMenu as Node, { attributes: true });

    swiperTabsContainer?.addEventListener('mouseenter', stopAutoplay);
    swiperTabsContainer?.addEventListener('mouseleave', startAutoplay);

    cleanups.push(() => {
      if (autoplayTimeout) clearTimeout(autoplayTimeout);
      observer.disconnect();
      menuObserver?.disconnect();
      swiperTabsContainer?.removeEventListener('mouseenter', stopAutoplay);
      swiperTabsContainer?.removeEventListener('mouseleave', startAutoplay);
      tabClickHandlers.forEach(([tab, handler]) => tab.removeEventListener('click', handler));
      introduction.destroy(true, false);
    });
  }

  cleanups.push(() => {
    bundle.variants?.destroy(true, false);
    bundle.caseStudies?.destroy(true, false);
  });

  return bundle;
}
