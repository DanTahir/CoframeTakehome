/**
 * The three Swiper carousels from the live site, ported from the site's inline
 * Swiper bootstrap.
 *
 *  - `.swiper.swiper-variants`   -- horizontal variant strip (A/B'd out of the
 *                                   current capture; guarded so its absence is
 *                                   a no-op rather than a crash)
 *  - `.swiper.swiper-case-studies` -- "creative" effect deck, whose slides are
 *                                   duplicated once at init so the loop has
 *                                   enough slides to rotate through
 *  - `.introduction.swiper`      -- the numbered steps, doubling as a Webflow
 *                                   tab strip with custom 4s autoplay
 *
 * NOTE ON CSS: Swiper's stylesheet is NOT imported here. The site ships
 * `swiper-bundle.min.css`, which the capture already pulled into the generated
 * cascade -- importing `swiper/css` too would duplicate every rule and risk
 * overriding the site's own overrides.
 */
import Swiper from 'swiper';
import { EffectCreative, Keyboard, Mousewheel } from 'swiper/modules';
import { type Teardown } from './runtime';

const originalScale = 0.85;
const originalOpacity = 0.25;

/** Swiper adds `progress` to slide elements at runtime; it isn't in the DOM types. */
type SwiperSlide = HTMLElement & { progress: number };

export function initCoframeSwipers(root: ParentNode = document): Teardown | void {
  const scope: ParentNode = root ?? document;
  const cleanups: Array<() => void> = [];

  // ---------------------------------------------------------------- variants
  const variantsEl = scope.querySelector<HTMLElement>('.swiper.swiper-variants');
  if (variantsEl) {
    const swiper1 = new Swiper(variantsEl, {
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
    cleanups.push(() => swiper1.destroy(true, true));
  }

  // ------------------------------------------------------------ case studies
  const caseStudiesEl = scope.querySelector<HTMLElement>('.swiper.swiper-case-studies');
  if (caseStudiesEl) {
    const caseStudiesWrapper = scope.querySelector<HTMLElement>(
      '.swiper-wrapper.cc-case-studies',
    );

    // The original duplicates every slide once so the loop has enough material.
    // Guarded by a flag so a re-mount (React strict mode) can't double-clone.
    const appendedClones: HTMLElement[] = [];
    if (caseStudiesWrapper && !caseStudiesWrapper.dataset.replicaCloned) {
      caseStudiesWrapper.dataset.replicaCloned = 'true';
      for (const item of Array.from(caseStudiesWrapper.children)) {
        const clone = item.cloneNode(true) as HTMLElement;
        caseStudiesWrapper.appendChild(clone);
        appendedClones.push(clone);
      }
      cleanups.push(() => {
        for (const clone of appendedClones) clone.remove();
        delete caseStudiesWrapper.dataset.replicaCloned;
      });
    }

    const swiper2 = new Swiper(caseStudiesEl, {
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
        prev: { opacity: originalOpacity, scale: originalScale, translate: ['-100%', 0, 0] },
        next: { opacity: originalOpacity, scale: originalScale, translate: ['100%', 0, 0] },
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
        // Fades slide contents and darkens the card background as it moves away
        // from centre. The background image is excluded so it stays fully opaque.
        setTranslate(swiper) {
          for (const rawSlide of swiper.slides) {
            const slide = rawSlide as SwiperSlide;
            const elements = slide.querySelectorAll<HTMLElement>(
              '*:not(.case-study-card__bg-image)',
            );
            if (!elements.length) continue;

            const raw = Math.sign(slide.progress) * Math.min(Math.abs(slide.progress), 1);
            const opacity = 1 - Math.abs(raw);
            const bgOpacity = 1 - 0.7 * Math.abs(raw);

            for (const el of elements) el.style.opacity = String(opacity);
            slide.style.backgroundColor = `rgba(0, 0, 0, ${bgOpacity})`;
          }
        },
      },
    });

    swiper2.slideToLoop(0, 0);
    cleanups.push(() => swiper2.destroy(true, true));
  }

  // ------------------------------------------------------------ introduction
  const introEl = scope.querySelector<HTMLElement>('.introduction.swiper');
  if (introEl) {
    const swiper3 = new Swiper(introEl, {
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
    cleanups.push(() => swiper3.destroy(true, true));

    const tabs = Array.from(scope.querySelectorAll<HTMLElement>('.introduction__step'));
    const tabContents = Array.from(
      scope.querySelectorAll<HTMLElement>('.introduction .w-tab-content .w-tab-pane'),
    );
    const swiperTabsContainer = scope.querySelector<HTMLElement>(
      '.introduction.swiper .swiper-wrapper',
    );

    const setActiveTab = (index: number) => {
      tabs.forEach((tab, i) => tab.classList.toggle('w--current', i === index));
      tabContents.forEach((content, i) => content.classList.toggle('w--tab-active', i === index));
    };

    // Custom autoplay: 4s per step, pausable by hover and by the mobile menu,
    // and it resumes with the *remaining* time rather than restarting the clock.
    const autoplayDelay = 4000;
    let autoplayTimeout: number | undefined;
    let remainingTime = autoplayDelay;
    let autoplayStart = Date.now();
    let currentTab = 0;

    const startAutoplay = () => {
      if (!tabs.length) return;
      for (const tab of tabs) tab.classList.remove('cc-animation-paused');
      window.clearTimeout(autoplayTimeout);
      autoplayStart = Date.now();
      autoplayTimeout = window.setTimeout(() => {
        currentTab = (currentTab + 1) % tabs.length;
        tabs[currentTab].click();
        remainingTime = autoplayDelay;
        startAutoplay();
      }, remainingTime);
    };

    const stopAutoplay = () => {
      for (const tab of tabs) tab.classList.add('cc-animation-paused');
      remainingTime = Math.max(remainingTime - (Date.now() - autoplayStart), 0);
      window.clearTimeout(autoplayTimeout);
    };

    tabs.forEach((tab, index) => {
      const onClick = (e: Event) => {
        // Each step is an `<a href="#w-tabs-0-data-w-pane-N">`. On the live
        // site `webflow.js` suppresses that href on `.w-tab-link` clicks, but
        // the sanitizer strips `webflow.js`, so we must suppress it ourselves
        // or the browser performs native fragment navigation and jumps the
        // page back to this section. Autoplay below synthesises
        // `tabs[n].click()` every 4s, so leaving this out traps the reader
        // here forever.
        e.preventDefault();
        setActiveTab(index);
        swiper3.slideTo(index, 300);
        currentTab = index;
        window.clearTimeout(autoplayTimeout);
        remainingTime = autoplayDelay;
        startAutoplay();
      };
      tab.addEventListener('click', onClick);
      cleanups.push(() => tab.removeEventListener('click', onClick));
    });

    const onSlideChange = () => {
      currentTab = swiper3.realIndex;
      setActiveTab(swiper3.realIndex);
    };
    swiper3.on('slideChange', onSlideChange);

    // Autoplay only starts once the section is half-visible.
    let swiper3AutoplayStarted = false;
    if (typeof IntersectionObserver !== 'undefined') {
      const swiper3Observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && !swiper3AutoplayStarted) {
              startAutoplay();
              swiper3AutoplayStarted = true;
            }
          }
        },
        { root: null, threshold: 0.5 },
      );
      swiper3Observer.observe(introEl);
      cleanups.push(() => swiper3Observer.disconnect());
    } else {
      startAutoplay();
      swiper3AutoplayStarted = true;
    }

    const mobileNavMenu = scope.querySelector<HTMLElement>('.w-nav-menu');
    if (mobileNavMenu) {
      const menuObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.attributeName !== 'data-nav-menu-open') continue;
          if (mobileNavMenu.hasAttribute('data-nav-menu-open')) stopAutoplay();
          else startAutoplay();
        }
      });
      menuObserver.observe(mobileNavMenu, { attributes: true });
      cleanups.push(() => menuObserver.disconnect());
    }

    if (swiperTabsContainer) {
      swiperTabsContainer.addEventListener('mouseenter', stopAutoplay);
      swiperTabsContainer.addEventListener('mouseleave', startAutoplay);
      cleanups.push(() => {
        swiperTabsContainer.removeEventListener('mouseenter', stopAutoplay);
        swiperTabsContainer.removeEventListener('mouseleave', startAutoplay);
      });
    }

    cleanups.push(() => window.clearTimeout(autoplayTimeout));
  }

  if (!cleanups.length) return;
  return () => cleanups.reverse().forEach((c) => c());
}
