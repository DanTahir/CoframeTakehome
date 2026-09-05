// Hero "multi-variant chart" animation.
//
// On the live site this is a Rive animation: Webflow's rive integration scans for
// [data-animation-type="rive"], reads the data-rive-* attributes off the container
// and instantiates the Rive runtime against the <canvas> child. This module does
// the same thing, against the self-hosted .riv file and a self-hosted WASM blob so
// the replica makes no remote requests.
//
// Renderer choice is load-bearing, not incidental: the live page loads
// @rive-app/webgl2 (observed fetching unpkg.com/@rive-app/webgl2@2.35.0/rive.wasm),
// and this .riv uses features the plain 2D-canvas renderer cannot draw. With
// @rive-app/canvas the file loads without error but only the artboard background
// paints - the canvas measured 2 distinct colours and a byte-identical checksum
// across frames, versus ~1555 colours and a changing checksum on the live site.
// Keep this on webgl2.
//
// Source attributes on the live container:
//   data-rive-url="...coframe_multi-variant_hero_chart.riv"
//   data-rive-state-machine="State Machine"  data-rive-artboard="Artboard"
//   data-rive-autoplay="true"  data-rive-fit="contain"  data-rive-alignment="center"
//   data-rive-is-touch-scroll-enabled="false"
//   data-rive-automatically-handle-events="false"
import {
  Alignment,
  Fit,
  Layout,
  Rive,
  RuntimeLoader,
} from '@rive-app/webgl2';

/**
 * Locally hosted Rive WASM, copied out of node_modules/@rive-app/webgl2.
 * Must be the webgl2 build - the canvas build's wasm is not interchangeable.
 */
export const RIVE_WASM_URL = '/assets/rive/rive-webgl2.wasm';

/**
 * The hero chart is *trigger-driven*, which is the whole reason a naive port
 * renders a static background. The .riv's state machine exposes exactly one
 * input - a trigger named `onRestart` (verified from the runtime's own report:
 * artboards: [{ name: 'Artboard', animations: ['Timeline'], stateMachines:
 * [{ name: 'State Machine', inputs: [{ name: 'onRestart', type: 58 }] }] }]).
 * With autoplay alone the machine sits on its idle entry state, reporting
 * isPlaying: true while painting only the artboard background, byte for byte
 * identical over seconds. Firing this trigger is what actually runs the chart.
 */
export const RESTART_TRIGGER = 'onRestart';

/**
 * Timings from Webflow's ix2 action list "a-4" (Play Chart Animation), read out
 * of webflow.schunk.571c3827ae3ad973.js. A click on .impact__replay-button
 * (e-6, MOUSE_CLICK -> GENERAL_START_ACTION actionListId 'a-4') runs:
 *   group 1, delay 0     - GENERAL_DISPLAY 'none' + STYLE_OPACITY 0 on the button
 *   group 2, delay 100   - PLUGIN_RIVE fire { name: 'State Machine',
 *                          inputs: { onRestart: true } } on the animation
 *   a-4-n-4/-3, delay 1e4 - GENERAL_DISPLAY 'flex' + STYLE_OPACITY 1 (300ms)
 * The same list runs once on load, which is why the live chart plays itself.
 */
export const TRIGGER_DELAY_MS = 100;
export const REVEAL_DELAY_MS = 10000;
export const REVEAL_FADE_MS = 300;

const FIT_BY_NAME: Record<string, Fit> = {
  cover: Fit.Cover,
  contain: Fit.Contain,
  fill: Fit.Fill,
  fitwidth: Fit.FitWidth,
  fitheight: Fit.FitHeight,
  none: Fit.None,
  scaledown: Fit.ScaleDown,
  layout: Fit.Layout,
};

const ALIGNMENT_BY_NAME: Record<string, Alignment> = {
  center: Alignment.Center,
  topleft: Alignment.TopLeft,
  topcenter: Alignment.TopCenter,
  topright: Alignment.TopRight,
  centerleft: Alignment.CenterLeft,
  centerright: Alignment.CenterRight,
  bottomleft: Alignment.BottomLeft,
  bottomcenter: Alignment.BottomCenter,
  bottomright: Alignment.BottomRight,
};

export function resolveFit(name: string | null | undefined): Fit {
  if (!name) return Fit.Contain;
  return FIT_BY_NAME[name.toLowerCase().replace(/[-_\s]/g, '')] ?? Fit.Contain;
}

export function resolveAlignment(name: string | null | undefined): Alignment {
  if (!name) return Alignment.Center;
  return ALIGNMENT_BY_NAME[name.toLowerCase().replace(/[-_\s]/g, '')] ?? Alignment.Center;
}

export interface RiveContainerConfig {
  src: string;
  stateMachine?: string;
  artboard?: string;
  autoplay: boolean;
  fit: Fit;
  alignment: Alignment;
  automaticallyHandleEvents: boolean;
  isTouchScrollEnabled: boolean;
}

/** Reads a container's data-rive-* attributes into a typed config. */
export function readRiveConfig(el: Element): RiveContainerConfig | null {
  const src = el.getAttribute('data-rive-url');
  if (!src) return null;
  return {
    src,
    stateMachine: el.getAttribute('data-rive-state-machine') || undefined,
    artboard: el.getAttribute('data-rive-artboard') || undefined,
    autoplay: el.getAttribute('data-rive-autoplay') === 'true',
    fit: resolveFit(el.getAttribute('data-rive-fit')),
    alignment: resolveAlignment(el.getAttribute('data-rive-alignment')),
    automaticallyHandleEvents:
      el.getAttribute('data-rive-automatically-handle-events') === 'true',
    isTouchScrollEnabled: el.getAttribute('data-rive-is-touch-scroll-enabled') === 'true',
  };
}

export interface RiveHandle {
  rive: Rive;
  container: Element;
  config: RiveContainerConfig;
  replay: () => void;
  destroy: () => void;
}

/**
 * Diagnostics for the load path, enabled with `?riveDebug=1`.
 *
 * Written synchronously to localStorage rather than the console, because the
 * failure mode being chased here wedges the main thread - once that happens the
 * page can no longer answer an injected script, so anything kept only in memory
 * is unreadable. localStorage persists per-origin, so a *second* tab can read
 * the record even while the first is unresponsive.
 */
const DIAG_KEY = 'rive:diag';

function riveDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('riveDebug') === '1';
  } catch {
    return false;
  }
}

function diag(event: string, detail?: Record<string, unknown>): void {
  if (!riveDebugEnabled()) return;
  try {
    const raw = window.localStorage.getItem(DIAG_KEY);
    const log = raw ? (JSON.parse(raw) as unknown[]) : [];
    log.push({ t: Date.now(), event, ...detail });
    // Cap the log so a runaway loop cannot exhaust storage.
    window.localStorage.setItem(DIAG_KEY, JSON.stringify(log.slice(-50)));
  } catch {
    // Storage disabled or full - diagnostics are best-effort.
  }
}

/** Instantiates one Rive container. Returns null if the markup is incomplete. */
export function initRiveContainer(container: Element): RiveHandle | null {
  const config = readRiveConfig(container);
  if (!config) return null;
  const canvas = container.querySelector('canvas');
  if (!(canvas instanceof HTMLCanvasElement)) return null;

  const layout = new Layout({ fit: config.fit, alignment: config.alignment });

  // Bounds the fallback below. Without this, a fallback load that *also* fails
  // re-enters onLoadError and retries forever; because each attempt re-parses a
  // 5.4 MB file, the resulting back-to-back long tasks wedge the main thread
  // outright (no paint, no timers, injected scripts never return).
  let loadErrorCount = 0;

  // Load gating for replay(). Calling rive.reset() before the file has finished
  // loading does not throw - it never returns. reset() drains the runtime's
  // internal task queue, and a play()/reset() issued while !readyForPlaying
  // re-adds itself to that same queue, so the drain loop can never empty it and
  // the main thread is wedged permanently (no paint, no timers, onLoad never
  // fires). Proven with a standalone UMD probe harness driving this same .riv:
  // constructing and waiting reaches onLoad in ~525ms and stays responsive,
  // whereas calling reset() right after construction logs the entry to that
  // call and then nothing further - not even the surrounding catch. Hence:
  // never touch reset()/play() before onLoad has fired.
  let loaded = false;
  let replayPending = false;

  diag('construct', {
    src: config.src,
    artboard: config.artboard,
    stateMachine: config.stateMachine,
    autoplay: config.autoplay,
  });

  const rive = new Rive({
    canvas,
    src: config.src,
    layout,
    autoplay: config.autoplay,
    // autoBind wires up the file's data bindings, which the chart's state machine
    // uses to drive its series - Webflow passes autoBind: true here.
    autoBind: true,
    artboard: config.artboard,
    stateMachines: config.stateMachine,
    isTouchScrollEnabled: config.isTouchScrollEnabled,
    automaticallyHandleEvents: config.automaticallyHandleEvents,
    // Webflow passes this and it is not optional in practice. Verified in the
    // live bundle (webflow.schunk.571c3827ae3ad973.js), whose Rive config is:
    //   { artboard, layout, autoplay, isTouchScrollEnabled,
    //     automaticallyHandleEvents, src, autoBind, stateMachines,
    //     useOffscreenRenderer: !0, onLoad, onLoadError }
    // With it, the runtime renders through one shared offscreen WebGL2 context
    // and blits the result into each canvas's 2D context - which is why the live
    // page's canvas answers getContext('2d') with real pixels despite using the
    // webgl2 runtime. Omitting it made the load path wedge the main thread.
    useOffscreenRenderer: true,
    onLoad: () => {
      loaded = true;
      diag('onLoad');
      // Without this the drawing surface stays at the canvas' unscaled backing
      // size and the chart renders blurry / clipped.
      rive.resizeDrawingSurfaceToCanvas();
      container.dispatchEvent(new Event('w-rive-load'));
      // Flush a replay that arrived before the file was ready. Deferred to a
      // fresh task so reset() never runs inside the runtime's own load callback.
      if (replayPending) {
        replayPending = false;
        window.setTimeout(applyReplay, 0);
      }
    },
    onLoadError: () => {
      loadErrorCount += 1;
      diag('onLoadError', { count: loadErrorCount });

      // Retry exactly once. Mirrors Webflow's fallback (drop the artboard and
      // state-machine pinning so a renamed artboard still renders its default
      // timeline), but never re-enters: if the fallback fails too, give up and
      // leave the canvas blank instead of looping.
      if (loadErrorCount > 1) {
        diag('onLoadError:giving-up');
        return;
      }

      try {
        rive.load({
          src: config.src,
          autoplay: true,
          artboard: undefined,
          stateMachines: undefined,
        } as ConstructorParameters<typeof Rive>[0]);
      } catch {
        // Nothing further to try; leave the canvas blank rather than throwing.
      }
    },
  });

  const onResize = () => {
    try {
      rive.resizeDrawingSurfaceToCanvas();
    } catch {
      // Instance may not be loaded yet; the onLoad handler covers that case.
    }
  };
  window.addEventListener('resize', onResize);

  /**
   * Restarts the animation by firing the state machine's trigger, mirroring
   * Webflow's PLUGIN_RIVE action. Only safe once the file is loaded.
   *
   * Deliberately NOT rive.reset(): reset() re-instantiates the artboard back to
   * the same idle entry state, so the chart stays on its static background. It
   * is also not rive.play() - the machine already reports isPlaying. Only the
   * trigger advances it. Measured against this .riv in a standalone harness:
   * after firing, sampled distinct colours climbed 15 -> 67 -> 80 -> 184 over
   * 2.5s across four different frame checksums, versus a single frozen checksum
   * when the trigger was never fired.
   */
  const applyReplay = () => {
    const stateMachine = config.stateMachine;
    if (!stateMachine) {
      diag('replay:no-state-machine');
      return;
    }
    try {
      const inputs = rive.stateMachineInputs(stateMachine);
      const trigger = inputs?.find((input) => input.name === RESTART_TRIGGER);
      if (!trigger || typeof trigger.fire !== 'function') {
        diag('replay:trigger-missing', {
          looked_for: RESTART_TRIGGER,
          found: (inputs ?? []).map((i) => i.name).join(','),
        });
        return;
      }
      trigger.fire();
      diag('replay:fired');
    } catch (error) {
      diag('replay:threw', { msg: String(error).slice(0, 200) });
    }
  };

  const replay = () => {
    if (!loaded) {
      // Do not touch reset() yet - see the `loaded` declaration above. The
      // request is remembered and flushed from onLoad instead.
      replayPending = true;
      diag('replay:deferred');
      return;
    }
    applyReplay();
  };

  return {
    rive,
    container,
    config,
    replay,
    destroy: () => {
      window.removeEventListener('resize', onResize);
      try {
        rive.cleanup();
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Boots every Rive container on the page and wires the hero's replay button.
 * The live page auto-clicks that button once on DOMContentLoaded, so we do the
 * same after load.
 */
export function initRiveAnimations(root: ParentNode = document): () => void {
  RuntimeLoader.setWasmUrl(RIVE_WASM_URL);

  const handles: RiveHandle[] = [];
  const cleanups: Array<() => void> = [];

  root.querySelectorAll('[data-animation-type="rive"]').forEach((container) => {
    const handle = initRiveContainer(container);
    if (!handle) return;
    handles.push(handle);

    // The replay button sits next to the animation inside .impact.
    const scope = container.closest('.impact') ?? root;
    const button = scope.querySelector('.impact__replay-button');
    if (button) {
      const timers: number[] = [];
      const el = button instanceof HTMLElement ? button : null;

      /** Replays Webflow's ix2 "Play Chart Animation" list (see constants). */
      const playChart = () => {
        // Group 1 (delay 0): hide the button for the duration of the animation.
        if (el) {
          el.style.display = 'none';
          el.style.opacity = '0';
        }
        // Group 2 (delay 100): fire the restart trigger. replay() is load-gated
        // internally, so if the file has not loaded yet this defers itself
        // until onLoad rather than touching the runtime early.
        timers.push(window.setTimeout(() => handle.replay(), TRIGGER_DELAY_MS));
        // a-4-n-4 / a-4-n-3 (delay 1e4): bring the button back for a re-run.
        timers.push(
          window.setTimeout(() => {
            if (el) {
              el.style.display = 'flex';
              el.style.transition = `opacity ${REVEAL_FADE_MS}ms`;
              el.style.opacity = '1';
            }
          }, REVEAL_DELAY_MS),
        );
      };

      const onClick = () => playChart();
      button.addEventListener('click', onClick);
      cleanups.push(() => {
        button.removeEventListener('click', onClick);
        timers.forEach((timer) => window.clearTimeout(timer));
      });
      // The live page runs the same action list once on load, which is what
      // makes the chart play itself on arrival.
      playChart();
    }
  });

  return () => {
    cleanups.forEach((fn) => fn());
    handles.forEach((h) => h.destroy());
  };
}
