'use client';

import { useEffect } from 'react';
import Swiper from 'swiper';
import { EffectCreative, Keyboard, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-creative';

/**
 * Port of the three Swiper instances plus the introduction tab autoplay from
 * scrape/scripts/35-body.js. The live site loads swiper@11 from jsDelivr; we
 * bundle the same major version locally so nothing is fetched at runtime.
 *
 * Every option below is copied verbatim from the original init blocks.
 */

const ORIGINAL_SCALE = 0.85;
const ORIGINAL_OPACITY = 0.25;

/** Introduction tab autoplay interval, in ms. */
export const AUTOPLAY_DELAY = 4000;

export function initCarousels(root: ParentNode = document): () => void {
  const cleanups: Array<() => void> = [];

  // ---- 1. Variants carousel ("compare" section) -------------------------
  let variantsSwiper: Swiper | undefined;
  if (root.querySelector('.swiper.swiper-variants')) {
    variantsSwiper = new Swiper('.swiper.swiper-variants', {
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
    cleanups.push(() => variantsSwiper?.destroy(true, true));
  }

  // ---- 2. Case studies / testimonials carousel --------------------------
  const caseStudiesWrapper = root.querySelector<HTMLElement>('.swiper-wrapper.cc-case-studies');
  let caseStudiesSwiper: Swiper | undefined;

  if (caseStudiesWrapper && root.querySelector('.swiper.swiper-case-studies')) {
    // The original duplicates every slide once so the loop has enough slides.
    if (!caseStudiesWrapper.dataset.slidesDuplicated) {
      const items = Array.from(caseStudiesWrapper.children);
      items.forEach((item) => caseStudiesWrapper.appendChild(item.cloneNode(true)));
      caseStudiesWrapper.dataset.slidesDuplicated = 'true';
    }

    const mousewheelFor = (sensitivity: number) => ({
      forceToAxis: true,
      releaseOnEdges: true,
      sensitivity,
      thresholdDelta: 5,
    });

    caseStudiesSwiper = new Swiper('.swiper.swiper-case-studies', {
      modules: [Keyboard, Mousewheel, EffectCreative],
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
          mousewheel: mousewheelFor(2),
          resistanceRatio: 0.2,
          touchRatio: 1.5,
          longSwipesRatio: 0.2,
        },
        768: {
          slidesPerView: 1.5,
          mousewheel: mousewheelFor(2),
          resistanceRatio: 0.3,
          touchRatio: 1.5,
          longSwipesRatio: 0.3,
        },
        479: {
          slidesPerView: 1.125,
          mousewheel: mousewheelFor(0.5),
          resistanceRatio: 0.5,
          touchRatio: 1.5,
          longSwipesRatio: 0.3,
        },
        320: {
          slidesPerView: 1.125,
          mousewheel: mousewheelFor(0.5),
          resistanceRatio: 0.5,
          touchRatio: 1.5,
          longSwipesRatio: 0.3,
        },
      },
      on: {
        // Dim and darken slides proportionally to how far off-center they are.
        setTranslate(swiper) {
          swiper.slides.forEach((slideElement) => {
            // Swiper augments each slide element with a `progress` value
            // (-1..1 relative to the active slide) when watchSlidesProgress
            // is on, but its types don't express that.
            const slide = slideElement as HTMLElement & { progress: number };
            const elements = slide.querySelectorAll<HTMLElement>(
              '*:not(.case-study-card__bg-image)',
            );
            if (!elements.length) return;

            const raw =
              Math.sign(slide.progress) * Math.min(Math.abs(slide.progress), 1);
            const opacity = 1 - Math.abs(raw);
            const bgOpacity = 1 - 0.7 * Math.abs(raw);

            elements.forEach((el) => {
              el.style.opacity = String(opacity);
            });
            slide.style.backgroundColor = `rgba(0, 0, 0, ${bgOpacity})`;
          });
        },
      },
    });

    caseStudiesSwiper.slideToLoop(0, 0);
    cleanups.push(() => caseStudiesSwiper?.destroy(true, true));
  }

  // ---- 3. Introduction steps carousel + tab autoplay --------------------
  const introElement = root.querySelector<HTMLElement>('.introduction.swiper');
  if (introElement) {
    const introSwiper = new Swiper('.introduction.swiper', {
      modules: [Keyboard, Mousewheel],
      keyboard: { enabled: true },
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
    cleanups.push(() => introSwiper.destroy(true, true));

    const tabs = Array.from(root.querySelectorAll<HTMLElement>('.introduction__step'));
    const tabContents = Array.from(
      root.querySelectorAll<HTMLElement>('.introduction .w-tab-content .w-tab-pane'),
    );
    const tabsContainer = root.querySelector<HTMLElement>(
      '.introduction.swiper .introduction__steps',
    );

    const setActiveTab = (index: number) => {
      tabs.forEach((tab, i) => tab.classList.toggle('w--current', i === index));
      tabContents.forEach((content, i) =>
        content.classList.toggle('w--tab-active', i === index),
      );
    };

    let autoplayTimeout: ReturnType<typeof setTimeout> | undefined;
    let remainingTime = AUTOPLAY_DELAY;
    let autoplayStart = Date.now();
    let currentTab = 0;
    let destroyed = false;

    const startAutoplay = () => {
      if (destroyed || tabs.length === 0) return;
      tabs.forEach((tab) => tab.classList.remove('cc-animation-paused'));
      clearTimeout(autoplayTimeout);
      autoplayStart = Date.now();
      autoplayTimeout = setTimeout(() => {
        currentTab = (currentTab + 1) % tabs.length;
        tabs[currentTab].click();
        remainingTime = AUTOPLAY_DELAY;
        startAutoplay();
      }, remainingTime);
    };

    const stopAutoplay = () => {
      tabs.forEach((tab) => tab.classList.add('cc-animation-paused'));
      const elapsed = Date.now() - autoplayStart;
      remainingTime = Math.max(remainingTime - elapsed, 0);
      clearTimeout(autoplayTimeout);
    };

    tabs.forEach((tab, index) => {
      const onClick = () => {
        setActiveTab(index);
        introSwiper.slideTo(index, 300);
        currentTab = index;
        clearTimeout(autoplayTimeout);
        remainingTime = AUTOPLAY_DELAY;
        startAutoplay();
      };
      tab.addEventListener('click', onClick);
      cleanups.push(() => tab.removeEventListener('click', onClick));
    });

    introSwiper.on('slideChange', () => {
      currentTab = introSwiper.realIndex;
      setActiveTab(introSwiper.realIndex);
    });

    if (tabsContainer) {
      tabsContainer.addEventListener('mouseenter', stopAutoplay);
      tabsContainer.addEventListener('mouseleave', startAutoplay);
      cleanups.push(() => {
        tabsContainer.removeEventListener('mouseenter', stopAutoplay);
        tabsContainer.removeEventListener('mouseleave', startAutoplay);
      });
    }

    // Autoplay only begins once the carousel is half-visible.
    if (typeof IntersectionObserver !== 'undefined') {
      let started = false;
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && !started) {
              started = true;
              startAutoplay();
            }
          }
        },
        { root: null, threshold: 0.5 },
      );
      observer.observe(introElement);
      cleanups.push(() => observer.disconnect());
    } else {
      startAutoplay();
    }

    // Pause autoplay while the mobile nav overlay is open.
    const mobileNavMenu = root.querySelector('.w-nav-menu');
    if (mobileNavMenu && typeof MutationObserver !== 'undefined') {
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

    cleanups.push(() => {
      destroyed = true;
      clearTimeout(autoplayTimeout);
    });
  }

  return () => cleanups.forEach((fn) => fn());
}

export default function Carousels() {
  useEffect(() => initCarousels(), []);
  return null;
}
