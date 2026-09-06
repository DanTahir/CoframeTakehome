/**
 * The "impact" section's Rive chart, plus its replay-button choreography.
 *
 * Upstream this is a Webflow IX2 interaction (`webflow.js`, stripped by the
 * sanitizer) driving a Rive state machine, kicked off by
 * `scrape/analysis/script-29.js` which simply does:
 *
 *     window.addEventListener('DOMContentLoaded', () => replayButton?.click())
 *
 * So the FIRST play and every REPLAY are the same code path: a click on
 * `.impact__replay-button`.
 *
 * The choreography is lifted from the captured IX2 payload, action list `"a-4"`
 * ("Play Chart Animation"), not invented — three action groups targeting the
 * replay button `45608e39-8450-89f5-f213-b80671242aa7` and the Rive plugin:
 *
 *   | group | delay   | action                                     |
 *   |-------|---------|--------------------------------------------|
 *   | 1     | 0       | GENERAL_DISPLAY `none` + STYLE_OPACITY `0` |
 *   | 2     | 100     | PLUGIN_RIVE → State Machine `onRestart`    |
 *   | 3     | 10000   | GENERAL_DISPLAY `flex` + STYLE_OPACITY `1` |
 *
 * i.e. the button hides itself, the chart restarts 100ms later, and the button
 * reappears 10s in (about when the animation finishes) to invite a replay.
 *
 * Note the button is NOT hidden by the captured markup: codegen strips inline
 * `opacity`/`display`, and `.impact__replay-button` is `display: flex` in CSS,
 * so it starts visible. Group 1 running at init is what establishes the
 * hidden-at-start state — without it the button would sit on top of the chart
 * from first paint.
 */
import type { Teardown } from './runtime';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyModule = any;

export interface RiveChartOptions {
  /**
   * Dynamic import of the Rive runtime. MUST be the same renderer build the
   * original page used — this .riv is a webgl2 export, and it renders a silent
   * blank canvas under `@rive-app/canvas` with no error of any kind.
   */
  load: () => Promise<AnyModule>;
  /** Self-hosted wasm. Without this the runtime fetches unpkg at runtime. */
  wasmUrl?: string;
}

/** Host element carrying the `data-rive-*` config (a DIV, not the canvas). */
const HOST_SELECTOR = '[data-rive-url]';
const REPLAY_SELECTOR = '.impact__replay-button';

const RESTART_DELAY_MS = 100;
const REPLAY_REVEAL_DELAY_MS = 10000;

export function createCoframeRiveChart(options: RiveChartOptions) {
  const { load, wasmUrl = '/assets/rive/rive-webgl2.wasm' } = options;

  return function initCoframeRiveChart(root: ParentNode = document): Teardown | void {
    // The template's generic Rive adapter looks for `canvas[data-rive-url]`.
    // On this page the attribute lives on the WRAPPER div and the canvas is its
    // child, so that selector matches nothing and the chart never mounts.
    const host = root.querySelector<HTMLElement>(HOST_SELECTOR);
    if (!host) return;

    const canvas = host.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) return;

    const src = host.dataset.riveUrl;
    if (!src) return;

    const stateMachineName = host.dataset.riveStateMachine ?? 'State Machine';
    const artboard = host.dataset.riveArtboard;
    const replayButton = root.querySelector<HTMLElement>(REPLAY_SELECTOR);

    let disposed = false;
    let instance: AnyModule = null;
    let loaded = false;
    const timers: number[] = [];

    const clearTimers = () => {
      for (const t of timers) window.clearTimeout(t);
      timers.length = 0;
    };

    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    /** IX2 group 1 — hide the button while the chart plays. */
    const hideReplayButton = () => {
      if (!replayButton) return;
      replayButton.style.display = 'none';
      replayButton.style.opacity = '0';
    };

    /** IX2 group 3 — bring it back once the animation has run its course. */
    const showReplayButton = () => {
      if (!replayButton) return;
      replayButton.style.display = 'flex';
      replayButton.style.opacity = '1';
    };

    /**
     * Fires the state machine's `onRestart` input.
     *
     * IX2 records this as `inputs: { onRestart: true }`, which is ambiguous
     * between a Rive trigger and a boolean, so both shapes are handled: a
     * trigger exposes `fire()`, a boolean only takes a `value`.
     */
    const fireRestart = () => {
      if (!instance) return;
      try {
        const inputs = instance.stateMachineInputs?.(stateMachineName);
        if (!inputs) return;
        for (const input of inputs) {
          if (input?.name !== 'onRestart') continue;
          if (typeof input.fire === 'function') input.fire();
          else input.value = true;
          return;
        }
      } catch (err) {
        console.warn('[replica] could not fire Rive onRestart input', err);
      }
    };

    /** The full a-4 sequence. Used for the initial play and every replay. */
    const playChartAnimation = () => {
      clearTimers();
      hideReplayButton();
      later(fireRestart, RESTART_DELAY_MS);
      later(showReplayButton, REPLAY_REVEAL_DELAY_MS);
    };

    const onReplayClick = (event: Event) => {
      event.preventDefault();
      // Ignore clicks that land before the runtime is ready: the button would
      // hide itself and schedule a reveal for a restart that never happened,
      // stranding the chart on frame 0 for 10s.
      if (!loaded) return;
      playChartAnimation();
    };

    // Establish the hidden start state immediately, before the (async) runtime
    // resolves, so the button never flashes over the chart on first paint.
    hideReplayButton();
    replayButton?.addEventListener('click', onReplayClick);

    const onResize = () => {
      try {
        instance?.resizeDrawingSurfaceToCanvas?.();
      } catch {
        /* best-effort */
      }
    };

    void load()
      .then((rive) => {
        if (disposed) return;

        try {
          rive.RuntimeLoader?.setWasmUrl?.(wasmUrl);
        } catch {
          /* older runtimes lack the setter */
        }

        // `data-rive-fit="contain"` / `data-rive-alignment="center"` from the
        // captured markup. Guarded because Layout/Fit/Alignment are only
        // present on the full runtime builds.
        let layout: AnyModule;
        try {
          const fitKey = (host.dataset.riveFit ?? 'contain').toLowerCase();
          const alignKey = (host.dataset.riveAlignment ?? 'center').toLowerCase();
          const fit = fitKey === 'contain' ? rive.Fit?.Contain : rive.Fit?.Cover;
          const alignment = alignKey === 'center' ? rive.Alignment?.Center : undefined;
          if (rive.Layout && fit) layout = new rive.Layout({ fit, alignment });
        } catch {
          /* fall back to the runtime's own default layout */
        }

        try {
          instance = new rive.Rive({
            src,
            canvas,
            artboard,
            stateMachines: stateMachineName,
            // `data-rive-autoplay="true"` upstream. The state machine is left
            // to advance on its own; `onRestart` only re-seeds it.
            autoplay: host.dataset.riveAutoplay !== 'false',
            layout,
            // Required so the webgl2 build shares a single GL context.
            useOffscreenRenderer: true,
            onLoad: () => {
              loaded = true;
              // Match the backing store to the CSS box or the chart renders
              // blurry and mis-scaled.
              onResize();
              // Upstream's script-29 clicks the replay button on
              // DOMContentLoaded. Doing it here instead of on a DOM event is
              // deliberate: this module mounts long after DOMContentLoaded has
              // already fired, so listening for it would never run, and firing
              // `onRestart` before `onLoad` is a no-op against an unloaded
              // state machine.
              playChartAnimation();
            },
          });
        } catch (err) {
          console.warn('[replica] Rive chart failed to initialise', err);
          // Leave the replay button visible so the section isn't silently dead.
          showReplayButton();
        }
      })
      .catch((err) => {
        console.warn(
          '[replica] Rive runtime unavailable — impact chart will stay blank. ' +
            'Install @rive-app/webgl2 (the build the original page used).',
          err,
        );
        showReplayButton();
      });

    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      clearTimers();
      window.removeEventListener('resize', onResize);
      replayButton?.removeEventListener('click', onReplayClick);
      if (replayButton) {
        replayButton.style.display = '';
        replayButton.style.opacity = '';
      }
      try {
        instance?.cleanup?.();
      } catch {
        /* best-effort */
      }
      instance = null;
    };
  };
}
