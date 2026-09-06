/**
 * Hero impact chart (Rive) plus its replay-button choreography.
 *
 * Three separately-verified constraints govern this module. Getting any one of
 * them wrong produces a blank canvas or a wedged main thread with no error.
 *
 * 1. RENDERER BUILD. The live page loads `@rive-app/webgl2@2.35.0` (observed
 *    fetching `unpkg.com/@rive-app/webgl2@2.35.0/rive.wasm` in this run's
 *    network log, recorded in `scrape/runtime-requirements.json`). This `.riv`
 *    does NOT render under the plain `@rive-app/canvas` build — no exception,
 *    no console error, just an empty canvas. The wasm is self-hosted at
 *    `/assets/rive/rive-webgl2.wasm` (verified byte-identical to the installed
 *    package) so the page never reaches out to unpkg at runtime.
 *
 * 2. THE CONFIG ATTRIBUTES LIVE ON A WRAPPER DIV, not on the canvas. The
 *    element is `div.impact__animation[data-rive-url]` with a bare `<canvas>`
 *    child, so a `canvas[data-rive-url]` selector (the generic adapter's
 *    default) matches nothing and the chart silently never mounts.
 *
 * 3. THE ANIMATION IS TRIGGER-DRIVEN, NOT AUTOPLAY. The state machine sits on
 *    its idle entry state until a trigger input named `onRestart` fires;
 *    `reset()` merely re-instantiates that same idle state, which renders a
 *    static frame. Do not call `reset()`/`play()` before `onLoad` either: on a
 *    not-yet-loaded instance that call never returns, because the task it
 *    queues re-adds itself to the very queue it is draining, wedging the main
 *    thread permanently.
 *
 * The replay choreography is Webflow IX2 action list "a-4" ("Play Chart
 * Animation"), bound to MOUSE_CLICK on the replay button by event "e-5".
 * Transcribed verbatim from the IX2 payload:
 *
 *   G1: GENERAL_DISPLAY  .impact__replay-button  "none"  delay     0
 *       STYLE_OPACITY     .impact__replay-button  0       delay     0
 *   G2: PLUGIN_RIVE       -> { name: "State Machine", inputs: { onRestart: true } }
 *                                                   delay   100
 *   G3: GENERAL_DISPLAY  .impact__replay-button  "flex"  delay 10000
 *       STYLE_OPACITY     .impact__replay-button  1       delay 10000, duration 300
 *
 * The first play is not a separate code path: the captured inline script
 * `scrape/analysis/script-29.js` does `replayButton.click()` on
 * DOMContentLoaded, so initial play and user replay are the same sequence. That
 * event has already fired by the time a React effect mounts, so the first play
 * is triggered from Rive's own `onLoad` instead.
 *
 * Finally, note that codegen strips the replay button's captured inline
 * `opacity:0; display:none` (both properties are in the sanitizer's strip
 * list), and `.impact__replay-button` is `display:flex` in the stylesheet — so
 * the button starts VISIBLE. Group 1 must therefore be applied at init, or it
 * sits on top of the chart on first paint.
 */
import { type EffectInit, type Teardown } from './runtime';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyModule = any;

const HOST_SELECTOR = '[data-rive-url]';
const REPLAY_SELECTOR = '.impact__replay-button';
const WASM_URL = '/assets/rive/rive-webgl2.wasm';

/** IX2 "a-4" constants. */
export const RESTART_TRIGGER = 'onRestart';
export const TRIGGER_DELAY_MS = 100;
export const REVEAL_DELAY_MS = 10000;
export const REVEAL_FADE_MS = 300;

export interface CoframeRiveOptions {
  /** Dynamic import of the renderer build the page used. */
  load: () => Promise<AnyModule>;
  wasmUrl?: string;
}

export function createCoframeRive(options: CoframeRiveOptions): EffectInit {
  const { load, wasmUrl = WASM_URL } = options;

  return function initCoframeRive(root: ParentNode = document): Teardown | void {
    const host = root.querySelector<HTMLElement>(HOST_SELECTOR);
    if (!host) return;

    const canvas = host.querySelector('canvas');
    if (!canvas) return;

    const src = host.getAttribute('data-rive-url');
    if (!src) return;

    const stateMachine = host.getAttribute('data-rive-state-machine') ?? undefined;
    const artboard = host.getAttribute('data-rive-artboard') ?? undefined;
    const autoplay = host.getAttribute('data-rive-autoplay') !== 'false';
    const replayButton = root.querySelector<HTMLElement>(REPLAY_SELECTOR);

    let disposed = false;
    let loaded = false;
    let replayPending = false;
    let rive: AnyModule = null;
    const timers: number[] = [];

    const clearTimers = () => {
      for (const t of timers) window.clearTimeout(t);
      timers.length = 0;
    };

    // --- IX2 a-4 group 1 -------------------------------------------------
    const hideReplayButton = () => {
      if (!replayButton) return;
      replayButton.style.transition = '';
      replayButton.style.display = 'none';
      replayButton.style.opacity = '0';
    };

    // --- IX2 a-4 group 3 -------------------------------------------------
    const revealReplayButton = () => {
      if (!replayButton) return;
      replayButton.style.display = 'flex';
      replayButton.style.transition = `opacity ${REVEAL_FADE_MS}ms ease-in-out`;
      // Next frame, so the transition has a start value to animate from.
      requestAnimationFrame(() => {
        if (!disposed && replayButton) replayButton.style.opacity = '1';
      });
    };

    // Apply group 1 immediately: the sanitizer removed the inline styles that
    // were keeping this button hidden at capture time.
    hideReplayButton();

    /** Fires the state-machine trigger. Safe only once `loaded` is true. */
    const fireRestart = () => {
      if (!rive || !stateMachine) return;
      try {
        const inputs = rive.stateMachineInputs?.(stateMachine);
        if (!inputs) return;
        const input = inputs.find((i: AnyModule) => i?.name === RESTART_TRIGGER);
        if (!input) return;
        // The IX2 payload expresses this as `inputs: { onRestart: true }`, which
        // is ambiguous between a trigger and a boolean. This input is a trigger
        // (type 58), but handle both shapes so a re-export as a boolean still
        // works.
        if (typeof input.fire === 'function') input.fire();
        else input.value = true;
      } catch (err) {
        console.warn('[replica] Rive restart trigger failed:', err);
      }
    };

    /** The full a-4 sequence. */
    const runReplaySequence = () => {
      if (disposed) return;
      clearTimers();
      hideReplayButton();
      timers.push(window.setTimeout(fireRestart, TRIGGER_DELAY_MS));
      timers.push(window.setTimeout(revealReplayButton, REVEAL_DELAY_MS));
    };

    const onReplayClick = (e: Event) => {
      // The button is a div, not an anchor, so there is no navigation to
      // suppress — but stop the click bubbling into any ancestor handler.
      e.preventDefault();
      if (!loaded) {
        replayPending = true;
        return;
      }
      runReplaySequence();
    };

    replayButton?.addEventListener('click', onReplayClick);

    void load()
      .then((mod: AnyModule) => {
        if (disposed) return;

        try {
          mod.RuntimeLoader?.setWasmUrl?.(wasmUrl);
        } catch {
          /* older runtimes lack the setter */
        }

        const layout =
          typeof mod.Layout === 'function'
            ? new mod.Layout({
                fit: mod.Fit?.[capitalise(host.getAttribute('data-rive-fit') ?? 'contain')] ?? mod.Fit?.Contain,
                alignment:
                  mod.Alignment?.[alignmentKey(host.getAttribute('data-rive-alignment'))] ??
                  mod.Alignment?.Center,
              })
            : undefined;

        try {
          rive = new mod.Rive({
            src,
            canvas,
            autoplay,
            artboard,
            stateMachines: stateMachine,
            layout,
            // Required by the webgl2 build so instances share one GL context.
            useOffscreenRenderer: true,
            onLoad: () => {
              loaded = true;
              if (disposed) return;
              // Match the backing store to the CSS box, or the chart renders
              // blurry / wrongly scaled.
              try {
                rive.resizeDrawingSurfaceToCanvas?.();
              } catch {
                /* best-effort */
              }
              // Stand in for script-29's DOMContentLoaded click, which has
              // already fired by the time this effect mounts. Deferred a tick
              // so no runtime call happens inside the onLoad callback itself.
              // This also absorbs any click that arrived before load.
              replayPending = false;
              timers.push(window.setTimeout(runReplaySequence, 0));
            },
            onLoadError: (err: unknown) => {
              console.warn('[replica] Rive failed to load the chart:', err);
            },
          });
        } catch (err) {
          console.warn('[replica] Rive failed to initialise:', err);
        }
      })
      .catch((err: unknown) => {
        console.warn(
          '[replica] Rive runtime not installed — the chart canvas will stay blank. ' +
            'Install the build reported in scrape/runtime-requirements.json.',
          err,
        );
      });

    const onResize = () => {
      if (!loaded || !rive) return;
      try {
        rive.resizeDrawingSurfaceToCanvas?.();
      } catch {
        /* best-effort */
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      clearTimers();
      window.removeEventListener('resize', onResize);
      replayButton?.removeEventListener('click', onReplayClick);
      try {
        rive?.cleanup?.();
      } catch {
        /* teardown must never throw during unmount */
      }
    };
  };
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/** Maps a Webflow alignment string such as "center" to Rive's enum key. */
function alignmentKey(value: string | null): string {
  if (!value) return 'Center';
  return value
    .split(/[\s-_]+/)
    .map((part) => capitalise(part))
    .join('');
}
