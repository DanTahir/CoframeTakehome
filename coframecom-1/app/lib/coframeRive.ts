/**
 * The hero "impact" chart: a Rive animation driven by an explicit trigger.
 *
 * THREE HARD-WON DETAILS, all load-bearing:
 *
 * 1. RENDERER MUST BE `@rive-app/webgl2`. The `@rive-app/canvas` build renders
 *    this particular .riv file wrong (the chart wedge draws as a solid block),
 *    because the file uses features the canvas renderer doesn't implement.
 *
 * 2. THE ANIMATION IS TRIGGER-DRIVEN, NOT AUTOPLAY-DRIVEN. Despite
 *    `data-rive-autoplay="true"` on the wrapper, the chart only draws when the
 *    state machine's `onRestart` trigger fires. Relying on autoplay alone
 *    leaves a static first frame.
 *
 * 3. THE WASM IS SELF-HOSTED. `RuntimeLoader.setWasmUrl` points at a local copy
 *    (byte-identical to the installed runtime's) so nothing is fetched from a
 *    CDN at runtime.
 *
 * The replay choreography mirrors the site's Webflow interaction: hide the
 * replay button, fire the trigger ~100ms later, then fade the button back in
 * after 10s (the animation's length). The site also auto-clicks the button once
 * on load, which is what makes the chart appear to play by itself.
 */
import { Rive, RuntimeLoader } from '@rive-app/webgl2';
import { type Teardown } from './runtime';

const WASM_URL = '/assets/rive/rive-webgl2.wasm';
const RESTART_TRIGGER = 'onRestart';

/** Timings lifted from the site's `a-4` action list. */
const TRIGGER_DELAY_MS = 100;
const REVEAL_DELAY_MS = 10000;
const REVEAL_FADE_MS = 300;

export function initCoframeRive(root: ParentNode = document): Teardown | void {
  const scope: ParentNode = root ?? document;
  const wrapper = scope.querySelector<HTMLElement>('[data-animation-type="rive"]');
  if (!wrapper) return;

  const canvas = wrapper.querySelector<HTMLCanvasElement>('canvas');
  const riveUrl = wrapper.getAttribute('data-rive-url');
  if (!canvas || !riveUrl) return;

  RuntimeLoader.setWasmUrl(WASM_URL);

  const stateMachine = wrapper.getAttribute('data-rive-state-machine') || undefined;
  const artboard = wrapper.getAttribute('data-rive-artboard') || undefined;
  const autoplay = wrapper.getAttribute('data-rive-autoplay') !== 'false';

  const timers: number[] = [];
  let loaded = false;
  let replayQueued = false;
  let disposed = false;

  const rive = new Rive({
    src: riveUrl,
    canvas,
    artboard,
    stateMachines: stateMachine,
    autoplay,
    automaticallyHandleEvents: wrapper.getAttribute('data-rive-automatically-handle-events') === 'true',
    onLoad: () => {
      loaded = true;
      // Match the canvas backing store to its CSS box so the chart is crisp.
      rive.resizeDrawingSurfaceToCanvas();
      if (replayQueued) {
        replayQueued = false;
        fireTrigger();
      }
    },
  });

  const fireTrigger = () => {
    if (disposed) return;
    if (!loaded) {
      // Clicked before the file finished loading -- run it from onLoad instead.
      replayQueued = true;
      return;
    }
    if (!stateMachine) return;
    try {
      const inputs = rive.stateMachineInputs(stateMachine);
      const trigger = inputs?.find((input) => input.name === RESTART_TRIGGER);
      trigger?.fire();
    } catch {
      // A missing/renamed trigger must not take the page down.
    }
  };

  const replayButton = scope.querySelector<HTMLElement>('.impact__replay-button');

  const runReplay = () => {
    if (replayButton) {
      replayButton.style.display = 'none';
      replayButton.style.opacity = '0';
    }

    timers.push(window.setTimeout(fireTrigger, TRIGGER_DELAY_MS));

    if (replayButton) {
      timers.push(
        window.setTimeout(() => {
          replayButton.style.display = 'flex';
          replayButton.style.transition = `opacity ${REVEAL_FADE_MS}ms ease`;
          // Next frame, so the transition has a start value to animate from.
          requestAnimationFrame(() => {
            replayButton.style.opacity = '1';
          });
        }, REVEAL_DELAY_MS),
      );
    }
  };

  const onReplayClick = () => {
    for (const t of timers.splice(0)) window.clearTimeout(t);
    runReplay();
  };

  replayButton?.addEventListener('click', onReplayClick);

  const onResize = () => {
    if (loaded) rive.resizeDrawingSurfaceToCanvas();
  };
  window.addEventListener('resize', onResize);

  // The site auto-clicks the replay button on load; this is that autoplay.
  runReplay();

  return () => {
    disposed = true;
    for (const t of timers.splice(0)) window.clearTimeout(t);
    replayButton?.removeEventListener('click', onReplayClick);
    window.removeEventListener('resize', onResize);
    try {
      rive.cleanup();
    } catch {
      /* already torn down */
    }
  };
}
