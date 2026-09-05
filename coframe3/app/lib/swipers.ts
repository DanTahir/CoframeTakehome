/**
 * Swiper carousels: variants strip, case-study cards, and the "how it works"
 * introduction tabs (which double as a swiper).
 *
 * Faithful port of the original inline Swiper setup, including:
 *   - the case-studies wrapper being duplicated once so the loop has enough
 *     slides to cycle without gaps,
 *   - the `setTranslate` hook that fades/darkens off-centre cards,
 *   - the bespoke 4s autoplay for the introduction tabs, which starts only when
 *     the swiper scrolls into view, pauses on hover and while the mobile nav is
 *     open, and resumes with the *remaining* time rather than restarting.
 *
 * The original loaded Swiper's UMD bundle from a CDN; here the npm package is
 * imported and only the modules the page actually uses are registered. The
 * bundle's stylesheet was scraped separately to `app/styles/swiper.css`.
 */

import Swiper from 'swiper';
import { EffectCreative, Keyboard, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperInstance, SwiperOptions } from 'swiper/types';

export const ORIGINAL_SCALE = 0.85;
export const ORIGINAL_OPACITY = 0.25;
export const INTRODUCTION_AUTOPLAY_DELAY = 4000;

/** Shared modules; the original relied on swiper-bundle registering everything. */
const MODULES = [Keyboard, Mousewheel, EffectCreative];

export const variantsSwiperOptions: SwiperOptions = {
  modules: MODULES,
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
};

export const caseStudiesSwiperOptions: SwiperOptions = {
  modules: MODULES,
  initialSlide: 0,
  slidesPerView: 2,
  watchSlidesProgress: true,
  loop: true,
  speed: 400,
  keyboard: { enabled: true },
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
    prev: { opacity: ORIGINAL_OPACITY, scale: ORIGINAL_SCALE, translate: ['-100%', 0, 0] },
    next: { opacity: ORIGINAL_OPACITY, scale: ORIGINAL_SCALE, translate: ['100%', 0, 0] },
  },
  breakpoints: {
    992: {
      slidesPerView: 2,
      mousewheel: { forceToAxis: true, releaseOnEdges: true, sensitivity: 2, thresholdDelta: 5 },
      resistanceRatio: 0.2,
      touchRatio: 1.5,
      longSwipesRatio: 0.2,
    },
    768: {
      slidesPerView: 1.5,
      mousewheel: { forceToAxis: true, releaseOnEdges: true, sensitivity: 2, thresholdDelta: 5 },
      resistanceRatio: 0.3,
      touchRatio: 1.5,
      longSwipesRatio: 0.3,
    },
    479: {
      slidesPerView: 1.125,
      mousewheel: { forceToAxis: true, releaseOnEdges: true, sensitivity: 0.5, thresholdDelta: 5 },
      resistanceRatio: 0.5,
      touchRatio: 1.5,
      longSwipesRatio: 0.3,
    },
    320: {
      slidesPerView: 1.125,
      mousewheel: { forceToAxis: true, releaseOnEdges: true, sensitivity: 0.5, thresholdDelta: 5 },
      resistanceRatio: 0.5,
      touchRatio: 1.5,
      longSwipesRatio: 0.3,
    },
  },
  on: {
    setTranslate(swiper: SwiperInstance) {
      for (const slide of swiper.slides) {
        const elements = slide.querySelectorAll<HTMLElement>('*:not(.case-study-card__bg-image)');
        if (elements.length === 0) continue;

        const rawProgress = (slide as HTMLElement & { progress?: number }).progress ?? 0;
        const raw = Math.sign(rawProgress) * Math.min(Math.abs(rawProgress), 1);

        const opacity = 1 - Math.abs(raw);
        const bgOpacity = 1 - 0.7 * Math.abs(raw);

        for (const el of elements) el.style.opacity = String(opacity);
        (slide as HTMLElement).style.backgroundColor = `rgba(0, 0, 0, ${bgOpacity})`;
      }
    },
  },
};

export const introductionSwiperOptions: SwiperOptions = {
  modules: MODULES,
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
};

/**
 * Duplicates every case-study slide once, as the original did, so the looped
 * carousel has enough slides to avoid a visible gap when wrapping around.
 */
export function duplicateCaseStudySlides(root: ParentNode = document): void {
  const wrapper = root.querySelector<HTMLElement>('.swiper-wrapper.cc-case-studies');
  if (!wrapper) return;
  for (const item of Array.from(wrapper.children)) {
    wrapper.appendChild(item.cloneNode(true));
  }
}

export function initSwipers(): () => void {
  const instances: SwiperInstance[] = [];
  const cleanups: Array<() => void> = [];

  if (document.querySelector('.swiper.swiper-variants')) {
    instances.push(new Swiper('.swiper.swiper-variants', variantsSwiperOptions));
  }

  duplicateCaseStudySlides();

  if (document.querySelector('.swiper.swiper-case-studies')) {
    const caseStudies = new Swiper('.swiper.swiper-case-studies', caseStudiesSwiperOptions);
    instances.push(caseStudies);
    caseStudies.slideToLoop(0, 0);
  }

  const introductionElement = document.querySelector<HTMLElement>('.introduction.swiper');
  if (introductionElement) {
    const introduction = new Swiper('.introduction.swiper', introductionSwiperOptions);
    instances.push(introduction);

    const tabs = Array.from(document.querySelectorAll<HTMLElement>('.introduction__step'));
    const tabContents = Array.from(
      document.querySelectorAll<HTMLElement>('.introduction .w-tab-content .w-tab-pane'),
    );
    const swiperTabsContainer = document.querySelector<HTMLElement>(
      '.introduction.swiper .swiper-wrapper',
    );

    const setActiveTab = (index: number) => {
      tabs.forEach((tab, i) => tab.classList.toggle('w--current', i === index));
      tabContents.forEach((content, i) => content.classList.toggle('w--tab-active', i === index));
    };

    let autoplayTimeout: ReturnType<typeof setTimeout> | undefined;
    let remainingTime = INTRODUCTION_AUTOPLAY_DELAY;
    let autoplayStart = Date.now();
    let currentTab = 0;

    const startAutoplay = () => {
      for (const tab of tabs) tab.classList.remove('cc-animation-paused');
      clearTimeout(autoplayTimeout);
      autoplayStart = Date.now();
      autoplayTimeout = setTimeout(() => {
        if (tabs.length === 0) return;
        currentTab = (currentTab + 1) % tabs.length;
        tabs[currentTab].click();
        remainingTime = INTRODUCTION_AUTOPLAY_DELAY;
        startAutoplay();
      }, remainingTime);
    };

    const stopAutoplay = () => {
      for (const tab of tabs) tab.classList.add('cc-animation-paused');
      const elapsed = Date.now() - autoplayStart;
      remainingTime = Math.max(remainingTime - elapsed, 0);
      clearTimeout(autoplayTimeout);
    };

    tabs.forEach((tab, index) => {
      const onClick = () => {
        setActiveTab(index);
        introduction.slideTo(index, 300);
        currentTab = index;
        clearTimeout(autoplayTimeout);
        remainingTime = INTRODUCTION_AUTOPLAY_DELAY;
        startAutoplay();
      };
      tab.addEventListener('click', onClick);
      cleanups.push(() => tab.removeEventListener('click', onClick));
    });

    introduction.on('slideChange', () => {
      currentTab = introduction.realIndex;
      setActiveTab(introduction.realIndex);
    });

    let autoplayStarted = false;
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && !autoplayStarted) {
              startAutoplay();
              autoplayStarted = true;
            }
          }
        },
        { root: null, threshold: 0.5 },
      );
      observer.observe(introductionElement);
      cleanups.push(() => observer.disconnect());
    }

    // Pause the tab rotation while the mobile nav covers the page.
    const mobileNavMenu = document.querySelector<HTMLElement>('.w-nav-menu');
    if (mobileNavMenu) {
      const navObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.attributeName !== 'data-nav-menu-open') continue;
          if (mobileNavMenu.hasAttribute('data-nav-menu-open')) stopAutoplay();
          else startAutoplay();
        }
      });
      navObserver.observe(mobileNavMenu, { attributes: true });
      cleanups.push(() => navObserver.disconnect());
    }

    if (swiperTabsContainer) {
      swiperTabsContainer.addEventListener('mouseenter', stopAutoplay);
      swiperTabsContainer.addEventListener('mouseleave', startAutoplay);
      cleanups.push(() => {
        swiperTabsContainer.removeEventListener('mouseenter', stopAutoplay);
        swiperTabsContainer.removeEventListener('mouseleave', startAutoplay);
      });
    }

    cleanups.push(() => clearTimeout(autoplayTimeout));
  }

  return () => {
    for (const fn of cleanups) fn();
    for (const instance of instances) instance.destroy(true, true);
  };
}
