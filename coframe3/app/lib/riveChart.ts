/**
 * Hero "impact" chart (Rive) and its replay choreography.
 *
 * On the real site this element is handled by Webflow's Rive plugin plus an
 * ix2 interaction; neither bundle is shipped here, so both are reimplemented
 * against the exact same DOM contract and timings extracted from the live
 * `webflow.schunk.571c3827ae3ad973.js` bundle.
 *
 * The ix2 action list `a-4` ("Play Chart Animation") is triggered by a
 * MOUSE_CLICK on the replay button (`e-5`) and has three action groups:
 *
 *   group 1  delay 0ms      GENERAL_DISPLAY  replay button -> display:none
 *                           STYLE_OPACITY    replay button -> opacity:0
 *   group 2  delay 100ms    PLUGIN_RIVE      { name: 'State Machine',
 *                                              inputs: { onRestart: true } }
 *   group 3  delay 10000ms  GENERAL_DISPLAY  replay button -> display:flex
 *                           STYLE_OPACITY    replay button -> opacity:1
 *                                            (duration 300ms)
 *
 * A separate inline script clicks the replay button once on DOMContentLoaded,
 * which is what plays the chart on first view.
 *
 * Three hard-won implementation requirements (all three cost a previous
 * attempt a broken chart, and all are load-bearing):
 *
 *   1. The renderer must be `@rive-app/webgl2`. The `@rive-app/canvas` build
 *      silently renders nothing for this particular .riv.
 *   2. The wasm is self-hosted and registered via `RuntimeLoader.setWasmUrl`
 *      before any `Rive` instance is constructed, otherwise the runtime
 *      reaches out to unpkg at load time.
 *   3. Every `reset()` / `play()` / input access must be gated behind `onLoad`.
 *      Calling them earlier throws and leaves the canvas blank. Because the
 *      replay click fires ~100ms after DOMContentLoaded — typically before a
 *      5.4MB .riv has parsed — an early trigger is queued and replayed on load
 *      rather than dropped.
 */

import { Alignment, Fit, Layout, Rive, RuntimeLoader } from '@rive-app/webgl2';

export const RIVE_WASM_URL = '/assets/rive/rive-webgl2.wasm';

/** ix2 `a-4` timings, verbatim from the Webflow bundle. */
export const REPLAY_TRIGGER_DELAY = 100;
export const REPLAY_REVEAL_DELAY = 10_000;
export const REPLAY_REVEAL_DURATION = 300;

export const RESTART_INPUT_NAME = 'onRestart';

let wasmConfigured = false;

/** Registers the self-hosted wasm exactly once per page. */
export function configureRiveWasm(url: string = RIVE_WASM_URL): void {
  if (wasmConfigured) return;
  RuntimeLoader.setWasmUrl(url);
  wasmConfigured = true;
}

export function resolveFit(token: string | null): Fit {
  switch (token) {
    case 'cover':
      return Fit.Cover;
    case 'fill':
      return Fit.Fill;
    case 'fitWidth':
      return Fit.FitWidth;
    case 'fitHeight':
      return Fit.FitHeight;
    case 'none':
      return Fit.None;
    case 'scaleDown':
      return Fit.ScaleDown;
    case 'contain':
    default:
      return Fit.Contain;
  }
}

export function resolveAlignment(token: string | null): Alignment {
  switch (token) {
    case 'topLeft':
      return Alignment.TopLeft;
    case 'topCenter':
      return Alignment.TopCenter;
    case 'topRight':
      return Alignment.TopRight;
    case 'centerLeft':
      return Alignment.CenterLeft;
    case 'centerRight':
      return Alignment.CenterRight;
    case 'bottomLeft':
      return Alignment.BottomLeft;
    case 'bottomCenter':
      return Alignment.BottomCenter;
    case 'bottomRight':
      return Alignment.BottomRight;
    case 'center':
    default:
      return Alignment.Center;
  }
}

export function initRiveChart(): () => void {
  const target = document.querySelector<HTMLElement>('[data-animation-type="rive"]');
  if (!target) return () => {};

  const canvas = target.querySelector<HTMLCanvasElement>('canvas');
  const src = target.getAttribute('data-rive-url');
  if (!canvas || !src) return () => {};

  const stateMachineName = target.getAttribute('data-rive-state-machine') || 'State Machine';
  const artboard = target.getAttribute('data-rive-artboard') || undefined;
  const autoplay = target.getAttribute('data-rive-autoplay') !== 'false';

  configureRiveWasm();

  let loaded = false;
  let pendingRestart = false;
  let disposed = false;
  const timeouts: Array<ReturnType<typeof setTimeout>> = [];

  const rive = new Rive({
    src,
    canvas,
    artboard,
    stateMachines: stateMachineName,
    autoplay,
    // Webflow sets both of these on this element; honouring them keeps mobile
    // scrolling from being swallowed by the canvas.
    isTouchScrollEnabled: target.getAttribute('data-rive-is-touch-scroll-enabled') === 'true',
    automaticallyHandleEvents:
      target.getAttribute('data-rive-automatically-handle-events') === 'true',
    layout: new Layout({
      fit: resolveFit(target.getAttribute('data-rive-fit')),
      alignment: resolveAlignment(target.getAttribute('data-rive-alignment')),
    }),
    // Shares one WebGL context across instances; also what Webflow's plugin uses.
    useOffscreenRenderer: true,
    onLoad: () => {
      loaded = true;
      // Must happen after load: sizes the drawing surface to the CSS box and
      // device pixel ratio, otherwise the chart renders blurry or clipped.
      rive.resizeDrawingSurfaceToCanvas();

      if (pendingRestart) {
        pendingRestart = false;
        fireRestart();
      }
    },
  });

  /** Fires the `onRestart` trigger, or queues it if the .riv is still loading. */
  function fireRestart(): void {
    if (disposed) return;

    if (!loaded) {
      pendingRestart = true;
      return;
    }

    try {
      const inputs = rive.stateMachineInputs(stateMachineName);
      const restart = inputs?.find((input) => input.name === RESTART_INPUT_NAME);
      if (restart) {
        restart.fire();
        // The state machine may have settled after its first run; make sure it
        // is advancing again so the trigger is actually consumed.
        if (!rive.isPlaying) rive.play(stateMachineName);
      }
    } catch {
      // A malformed/absent state machine should never break the rest of the page.
    }
  }

  // --- ix2 `a-4`, reimplemented -------------------------------------------
  const replayButton = document.querySelector<HTMLElement>('.impact__replay-button');

  const runReplayChoreography = () => {
    if (!replayButton) {
      fireRestart();
      return;
    }

    // Group 1 (0ms)
    replayButton.style.display = 'none';
    replayButton.style.opacity = '0';

    // Group 2 (100ms)
    timeouts.push(setTimeout(fireRestart, REPLAY_TRIGGER_DELAY));

    // Group 3 (10000ms, opacity over 300ms)
    timeouts.push(
      setTimeout(() => {
        replayButton.style.display = 'flex';
        replayButton.style.transition = `opacity ${REPLAY_REVEAL_DURATION}ms ease-in-out`;
        replayButton.style.opacity = '1';
      }, REPLAY_REVEAL_DELAY),
    );
  };

  replayButton?.addEventListener('click', runReplayChoreography);

  // The original page clicks the replay button once on DOMContentLoaded to
  // kick off the first play-through.
  runReplayChoreography();

  const onResize = () => {
    if (loaded) rive.resizeDrawingSurfaceToCanvas();
  };
  window.addEventListener('resize', onResize);

  return () => {
    disposed = true;
    for (const id of timeouts) clearTimeout(id);
    replayButton?.removeEventListener('click', runReplayChoreography);
    window.removeEventListener('resize', onResize);
    try {
      rive.cleanup();
    } catch {
      // Instance may not have finished loading; nothing to clean up.
    }
  };
}
