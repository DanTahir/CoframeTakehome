/**
 * Viewport-swapped hero/card images.
 *
 * WHY THIS EXISTS
 * ---------------
 * cash.app/bank renders eight `<img class="...responsiveImage...">` nodes whose
 * `src` is chosen **client-side by viewport width**. Below the site's own
 * tablet-portrait breakpoint each one is replaced by a *different asset* — not a
 * rescale or a smart-crop of the same file. The hero is the clearest case:
 *
 *   desktop  Nov25-release_Bank_Desktop_Hero.png        (4206x2055, landscape)
 *   mobile   CAS2515_Bank_HandOver_02_NJ_Pink__1_.png   (a different photograph)
 *
 * The capture browser only ever ran at 1440px, so the captured markup contains
 * the desktop asset for all eight nodes and the mobile files were never even
 * requested. Without this effect the replica shows desktop imagery at phone
 * widths: visually wrong, and it was worth ~35% pixel diff on all three phone
 * viewports (vs ~1-3% on tablet/laptop) before this landed.
 *
 * The mobile files are fetched via `extraAssets` in `replica.config.json`.
 *
 * BREAKPOINT
 * ----------
 * 759px is not a guess. The site's bundle defines its breakpoints as
 *
 *     let i = "760px", s = "1024px";   // bpTabletPortrait, bpTabletLandscape
 *     let r = parseInt(i, 10) - 1;     // -> 759  (max-width for "below tablet")
 *
 * and `max-width:759px` appears verbatim in the site's own CSS. Probing the live
 * page at ten widths confirmed the swap happens between 700px and 768px.
 *
 * The table is generated from `scrape/asset-map.json`, and
 * `tests/responsiveImages.test.ts` re-derives it from the capture artifacts and
 * fails if it drifts. Deriving it mechanically mattered: the mobile asset for
 * the second entry is named `Bank_Desktop_2UP_001_2.png` — pairing these by
 * filename would have got it wrong.
 */

import type { EffectInit } from './runtime';
import { $all } from './runtime';

/** Site's own "below tablet portrait" query: bpTabletPortrait (760px) - 1. */
export const CASH_MOBILE_MEDIA_QUERY = '(max-width: 759px)';

export interface ResponsiveImagePair {
  /** Local path baked into the captured markup (desktop capture viewport). */
  desktop: string;
  /** Local path the live site uses below `CASH_MOBILE_MEDIA_QUERY`. */
  mobile: string;
}

/** DOM order of `img[class*="responsiveImage"]` within the page. */
export const CASH_RESPONSIVE_IMAGES: readonly ResponsiveImagePair[] = [
  // [0] GalleryProductPromoCard — page hero
  {
    desktop: '/assets/img/Nov25-release_Bank_Desktop_Hero.b0378ea1.png',
    mobile: '/assets/img/CAS2515_Bank_HandOver_02_NJ_Pink__1_.9d6e7e0e.png',
  },
  // [1] GalleryDynamicCard — "no fees" 2-up
  {
    desktop: '/assets/img/new-2up-no-fees-desktop.eb0e9e62.png',
    mobile: '/assets/img/Bank_Desktop_2UP_001_2.ad2d3b2c.png',
  },
  // [2] GalleryDynamicCard — 2-up 002
  {
    desktop: '/assets/img/Bank_Desktop_2UP_002.ec8edfdb.png',
    mobile: '/assets/img/Bank_Mobile_2UP_002.108e3b5c.png',
  },
  // [3] Security 3-up — overdraft
  {
    desktop: '/assets/img/Overdraft_Desktop_Security_3UP_001.c898f56f.png',
    mobile: '/assets/img/Overdraft_Mobile_Security_3UP_001.b3dd8429.png',
  },
  // [4] Security 3-up — 24/7 fraud monitoring
  {
    desktop: '/assets/img/24_7_Fraud.26159eea.png',
    mobile: '/assets/img/24_7_Fraud__1_.4046fbfe.png',
  },
  // [5] Explore-more 3-up — 001
  {
    desktop: '/assets/img/Bank_Desktop_ExploreMore_3UP_001.568f37f3.png',
    mobile: '/assets/img/Bank_Mobile_ExploreMore_3UP_001.e9da9554.png',
  },
  // [6] Explore-more 3-up — 002
  {
    desktop: '/assets/img/Bank_Desktop_ExploreMore_3UP_002.23a9ce99.png',
    mobile: '/assets/img/Bank_Mobile_ExploreMore_3UP_002-1.1b7ddb45.png',
  },
  // [7] Explore-more 3-up — 003 (bitcoin)
  {
    desktop: '/assets/img/Bank_Desktop_ExploreMore_3UP_003.08eb714f.png',
    mobile: '/assets/img/smaller-mobile-btc-green-bg.635ff23e.png',
  },
];

/**
 * Remembers the desktop src so repeated init calls (React strict mode) and
 * teardown can both resolve the pair regardless of which variant is live.
 */
const DESKTOP_SRC_ATTR = 'data-replica-desktop-src';

/**
 * Swaps the eight responsive images between their desktop and mobile assets,
 * following `CASH_MOBILE_MEDIA_QUERY` and reacting to live viewport changes.
 */
export const initCashResponsiveImages: EffectInit = (root = document) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

  // Scope to the site's own responsive-image marker class so unrelated <img>
  // nodes (quick-hit icons, nav thumbnails) can never be swapped by accident.
  const candidates = $all<HTMLImageElement>('img[class*="responsiveImage"]', root);
  if (!candidates.length) return;

  /** Pair up each element with its table entry by whichever variant it shows. */
  const targets: { img: HTMLImageElement; pair: ResponsiveImagePair }[] = [];
  for (const img of candidates) {
    const remembered = img.getAttribute(DESKTOP_SRC_ATTR);
    const current = img.getAttribute('src') ?? '';
    const key = remembered ?? current;
    const pair = CASH_RESPONSIVE_IMAGES.find((p) => p.desktop === key || p.mobile === key);
    if (!pair) continue;
    if (!remembered) img.setAttribute(DESKTOP_SRC_ATTR, pair.desktop);
    targets.push({ img, pair });
  }
  if (!targets.length) return;

  const mq = window.matchMedia(CASH_MOBILE_MEDIA_QUERY);

  const apply = () => {
    for (const { img, pair } of targets) {
      const wanted = mq.matches ? pair.mobile : pair.desktop;
      // Compare against the attribute, not `img.src` (which is absolutised),
      // and only write on a real change so we never restart a decode.
      if (img.getAttribute('src') !== wanted) img.setAttribute('src', wanted);
    }
  };

  apply();
  mq.addEventListener('change', apply);

  return () => {
    mq.removeEventListener('change', apply);
    // Restore the markup's original (desktop) src so a remount starts clean.
    for (const { img, pair } of targets) {
      if (img.getAttribute('src') !== pair.desktop) img.setAttribute('src', pair.desktop);
      img.removeAttribute(DESKTOP_SRC_ATTR);
    }
  };
};
