/**
 * Responsive video sources for the six `<video>` elements on the page.
 *
 * WHY THIS TABLE EXISTS
 * ---------------------
 * The original page renders each `<video>` with **no** `src` and **no**
 * `<source>` child in server-rendered HTML. Its BackgroundVideo component picks
 * a source client-side, on hydration:
 *
 *     sources.forEach(s => {
 *       const mq = window.matchMedia(`(${s.mediaQuery})`);
 *       if (mq.matches) setSelected(s);
 *       mq.addEventListener('change', ...);
 *     });
 *
 * So the captured static markup contains six *empty* video elements, and the
 * source URLs live only in `__NEXT_DATA__`. The capture browser also never
 * requested the mobile variants (its viewport only matched the desktop media
 * query), which is why they are fetched via `extraAssets` in
 * `replica.config.json`.
 *
 * The entries below are ordered by DOM order of `<video>` elements, which was
 * verified to match `__NEXT_DATA__.props.pageProps.sections[]` order:
 *   0-3 -> the four GalleryDeepDiveSection sections (sections 2,3,4,5)
 *   4   -> GalleryImageSpotlightSection (section 8)
 *   5   -> GalleryCardSection (section 10)
 *
 * Generated from `__NEXT_DATA__` + `scrape/asset-map.json` and verified against
 * files on disk; see `tests/videoSources.test.ts`, which re-derives this table
 * from the capture artifacts and fails if it drifts.
 */

export interface VideoSource {
  /** Raw media query text from the CMS, e.g. `min-width:1024px`. */
  mediaQuery: string;
  /** Local, self-hosted path under `public/`. */
  src: string;
  type: string;
}

/** Indexed by DOM order of `<video>` elements within the page. */
export const CASH_VIDEO_SOURCES: readonly VideoSource[][] = [
  // [0] GalleryDeepDiveSection — Cash App Card
  [
    {
      mediaQuery: 'min-width:1px',
      src: '/assets/video/Bank-Spotlight_Cash-App-Card-HANDBRAKE-_Mobile.6482ca3c.mp4',
      type: 'video/mp4',
    },
    {
      mediaQuery: 'min-width:1024px',
      src: '/assets/video/Bank_Spotlight-desktop-Cash-App-Card-HANDBRAKE-.bac29396.mp4',
      type: 'video/mp4',
    },
  ],
  // [1] GalleryDeepDiveSection — Paycheck
  [
    {
      mediaQuery: 'min-width:1px',
      src: '/assets/video/Deep_dive_2_Mobile_2D-Motion_Paycheck_Web_01_1276x968.7c88d44d.mp4',
      type: 'video/mp4',
    },
    {
      mediaQuery: 'min-width:1024px',
      src: '/assets/video/Deep-dive-2_Desktop_2D-Motion_Paycheck_Web_01_1276x968.44df67ba.mp4',
      type: 'video/mp4',
    },
  ],
  // [2] GalleryDeepDiveSection — Savings
  [
    {
      mediaQuery: 'min-width:1px',
      src: '/assets/video/04_Carousel_Savings_withPercentage.d0043eca.mp4',
      type: 'video/mp4',
    },
    {
      mediaQuery: 'min-width:1024px',
      src: '/assets/video/d-Savings-progress-3.25_bv-White.16f43980.mp4',
      type: 'video/mp4',
    },
  ],
  // [3] GalleryDeepDiveSection — Send/Receive
  [
    {
      mediaQuery: 'min-width:1px',
      src: '/assets/video/2D-Motion_SendReceive_web_01_1038x1038_Mobile.056adc2b.mp4',
      type: 'video/mp4',
    },
    {
      mediaQuery: 'min-width:1024px',
      src: '/assets/video/Deep-dive-4_Desktop_2D-Motion_SendReceive_web_01_1038x1038.4c38a84c.mp4',
      type: 'video/mp4',
    },
  ],
  // [4] GalleryImageSpotlightSection — Money tab carousel
  [
    {
      mediaQuery: 'min-width:1px',
      src: '/assets/video/ct-Spotlight_pf-CAG_d-Money-tab-layered-carousel_v-Center-Mo.883cf101.mp4',
      type: 'video/mp4',
    },
    {
      mediaQuery: 'min-width:1024px',
      src: '/assets/video/ct-Spotlight_pf-CAG_d-Money-tab-layered-carousel_v-Right-Des.507ddc9a.mp4',
      type: 'video/mp4',
    },
  ],
  // [5] GalleryCardSection — Security / card lock (single source, no desktop variant)
  [
    {
      mediaQuery: 'min-width:1px',
      src: '/assets/video/2D-Motion_SecurityCardLock_web_01_1038x1038.3d849133.mp4',
      type: 'video/mp4',
    },
  ],
];
