/**
 * Background video playback — a faithful re-implementation of the original
 * page's `BackgroundVideo` component.
 *
 * The recovered component (from the captured JS chunks) does five things:
 *
 *  1. Picks a `<source>` client-side from a `sources[]` list, each entry keyed
 *     by a media query, with a live `change` listener so the source swaps when
 *     the viewport crosses a breakpoint.
 *  2. Renders `muted={!!shouldPlaySound}` in JSX but *also* runs
 *     `videoEl.muted = !shouldPlaySound` in an effect — which is why the
 *     captured HTML has no `muted` attribute yet the videos play silently.
 *     We set the DOM property, matching the effect.
 *  3. Loops, plays inline, and drives play/pause imperatively (there is no
 *     `autoplay` attribute in the capture, so `shouldAutoplayIfPossible` was
 *     false and playback is started by script).
 *  4. Pauses while the nav overlay is open (`shouldPauseIfNavOpen`), which we
 *     observe via the header's `data-nav-open` attribute so this module stays
 *     decoupled from `cashNav`.
 *  5. Honours `prefers-reduced-motion` (the original has a dedicated
 *     `(prefers-reduced-motion: no-preference)` hook).
 *
 * The sibling pause/play button is an `unstyledButton`+`controlButton` whose
 * `aria-label` is "Pause" while playing and "Play" while paused, with an SVG
 * that swaps between two vertical bars and a triangle. All six buttons are
 * server-rendered as "Pause", confirming playback starts immediately.
 */

import { CASH_VIDEO_SOURCES, type VideoSource } from './cashVideoSources';
import type { EffectInit, Teardown } from './runtime';

const WIRED_ATTR = 'data-replica-video-wired';

/** Guarded play/pause helpers mirroring the original's readyState checks. */
function safePlay(v: HTMLVideoElement): void {
  if (!v.paused) return;
  // `play()` rejects if interrupted or if autoplay is blocked; ignore both.
  void v.play().catch(() => {});
}

function safePause(v: HTMLVideoElement): void {
  if (v.paused) return;
  v.pause();
}

const PAUSE_ICON_BARS = `<path d="M1 0V12" stroke="var(--control-icon-color, white)" stroke-width="2"></path><path d="M9 0V12" stroke="var(--control-icon-color, white)" stroke-width="2"></path>`;

const PLAY_ICON_TRIANGLE = `<path d="M1 1V13L12 7L1 1Z" stroke="var(--control-icon-color, white)" stroke-width="2" stroke-linejoin="round" fill="none"></path>`;

/**
 * Repaints a control button to reflect `playing`, matching the original SVG:
 * playing -> two bars at translate(20,19); paused -> triangle at translate(20,18).
 */
function paintControl(button: HTMLElement, playing: boolean): void {
  button.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  const g = button.querySelector('svg > g');
  if (!g) return;
  g.setAttribute('transform', playing ? 'translate(20, 19)' : 'translate(20, 18)');
  g.innerHTML = playing ? PAUSE_ICON_BARS : PLAY_ICON_TRIANGLE;
}

/** Selects the source whose media query matches, preferring later entries. */
function pickSource(sources: readonly VideoSource[]): VideoSource | null {
  let chosen: VideoSource | null = null;
  for (const s of sources) {
    if (window.matchMedia(`(${s.mediaQuery})`).matches) chosen = s;
  }
  return chosen ?? sources[0] ?? null;
}

export const initCashVideos: EffectInit = (root: ParentNode = document): Teardown | void => {
  const videos = Array.from(root.querySelectorAll<HTMLVideoElement>('video[data-testid="video"]'));
  if (!videos.length) return;

  const teardowns: Teardown[] = [];
  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  videos.forEach((video, index) => {
    // Idempotent: React strict mode mounts effects twice in development.
    if (video.getAttribute(WIRED_ATTR) === '1') return;

    const sources = CASH_VIDEO_SOURCES[index];
    if (!sources || !sources.length) return;
    video.setAttribute(WIRED_ATTR, '1');

    // --- element properties (match the original's JSX + effect) ------------
    video.muted = true; // effect sets `.muted = !shouldPlaySound`, sound is off
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';

    // --- play/pause state --------------------------------------------------
    // Reduced motion keeps the video paused (and the button reading "Play").
    let userPaused = reduceMotion;
    let navOpen = false;
    const shouldPlay = () => !userPaused && !navOpen;

    const sync = () => {
      if (shouldPlay()) safePlay(video);
      else safePause(video);
    };

    // --- source selection, with live breakpoint swapping ------------------
    let currentSrc = '';
    const applySource = () => {
      const next = pickSource(sources);
      if (!next || next.src === currentSrc) return;
      currentSrc = next.src;

      let sourceEl = video.querySelector('source');
      if (!sourceEl) {
        sourceEl = document.createElement('source');
        video.appendChild(sourceEl);
      }
      sourceEl.setAttribute('src', next.src);
      sourceEl.setAttribute('type', next.type);

      const wasPlaying = !video.paused;
      video.load();
      if (wasPlaying || shouldPlay()) safePlay(video);
    };

    const mqls = sources.map((s) => window.matchMedia(`(${s.mediaQuery})`));
    const onMqChange = () => applySource();
    for (const mql of mqls) {
      mql.addEventListener('change', onMqChange);
      teardowns.push(() => mql.removeEventListener('change', onMqChange));
    }

    applySource();

    // --- the sibling pause/play control -----------------------------------
    const button = video.parentElement?.querySelector<HTMLElement>(
      'button[class*="__controlButton"]',
    );
    if (button) {
      paintControl(button, shouldPlay());
      const onClick = (event: Event) => {
        event.preventDefault();
        userPaused = !userPaused;
        sync();
        paintControl(button, shouldPlay());
      };
      button.addEventListener('click', onClick);
      teardowns.push(() => button.removeEventListener('click', onClick));

      // Keep the label honest if playback stops for any other reason.
      const onPlay = () => paintControl(button, true);
      const onPause = () => paintControl(button, false);
      video.addEventListener('play', onPlay);
      video.addEventListener('pause', onPause);
      teardowns.push(() => {
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
      });
    }

    // --- pause while the nav overlay is open ------------------------------
    const header = document.querySelector<HTMLElement>('header[data-nav-open]');
    if (header) {
      const readNav = () => {
        const open = header.getAttribute('data-nav-open') === 'true';
        if (open === navOpen) return;
        navOpen = open;
        sync();
      };
      readNav();
      const observer = new MutationObserver(readNav);
      observer.observe(header, { attributes: true, attributeFilter: ['data-nav-open'] });
      teardowns.push(() => observer.disconnect());
    }

    sync();
    teardowns.push(() => {
      video.removeAttribute(WIRED_ATTR);
      safePause(video);
    });
  });

  if (!teardowns.length) return;
  return () => {
    for (const t of teardowns) t();
  };
};
