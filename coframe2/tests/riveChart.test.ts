// Hero Rive chart wiring.
//
// The real @rive-app/webgl2 needs WebGL2 + WASM, neither of which jsdom has, so
// the Rive class and RuntimeLoader are mocked while the genuine Fit/Alignment
// enums are kept (via importOriginal) so the config-resolution assertions are
// still checked against real enum values.
//
// This must mock the same package riveChart.ts imports (webgl2, matching the live
// site) - mocking @rive-app/canvas here would silently leave the real runtime
// loaded in the module under test.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const riveInstances: Array<Record<string, unknown>> = [];
const setWasmUrl = vi.fn();

vi.mock('@rive-app/webgl2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rive-app/webgl2')>();

  class MockRive {
    props: Record<string, unknown>;
    resizeDrawingSurfaceToCanvas = vi.fn();
    reset = vi.fn();
    play = vi.fn();
    cleanup = vi.fn();
    load = vi.fn();
    // The hero chart is driven by firing the state machine's 'onRestart'
    // trigger, so the mock has to expose the same input surface the real
    // runtime does (StateMachineInput with a fire() method).
    fireTrigger = vi.fn();
    stateMachineInputs = vi.fn(() => [
      { name: 'onRestart', type: 58, fire: this.fireTrigger },
    ]);

    constructor(props: Record<string, unknown>) {
      this.props = props;
      riveInstances.push(this as unknown as Record<string, unknown>);
    }
  }

  return {
    ...actual,
    Rive: MockRive,
    RuntimeLoader: { ...actual.RuntimeLoader, setWasmUrl },
  };
});

const { Alignment, Fit } = await import('@rive-app/webgl2');
const {
  REVEAL_DELAY_MS,
  REVEAL_FADE_MS,
  RIVE_WASM_URL,
  TRIGGER_DELAY_MS,
  initRiveAnimations,
  initRiveContainer,
  readRiveConfig,
  resolveAlignment,
  resolveFit,
} = await import('../app/lib/riveChart');
const { mountBody, unmountBody } = await import('./helpers');

describe('Rive fit resolution', () => {
  it('maps every documented fit name', () => {
    expect(resolveFit('contain')).toBe(Fit.Contain);
    expect(resolveFit('cover')).toBe(Fit.Cover);
    expect(resolveFit('fill')).toBe(Fit.Fill);
    expect(resolveFit('fitwidth')).toBe(Fit.FitWidth);
    expect(resolveFit('fitheight')).toBe(Fit.FitHeight);
    expect(resolveFit('none')).toBe(Fit.None);
    expect(resolveFit('scaledown')).toBe(Fit.ScaleDown);
  });

  it('tolerates hyphens, underscores, spaces and casing', () => {
    expect(resolveFit('fit-width')).toBe(Fit.FitWidth);
    expect(resolveFit('FIT_WIDTH')).toBe(Fit.FitWidth);
    expect(resolveFit('Scale Down')).toBe(Fit.ScaleDown);
  });

  it('defaults to contain for missing or unknown values', () => {
    expect(resolveFit(null)).toBe(Fit.Contain);
    expect(resolveFit(undefined)).toBe(Fit.Contain);
    expect(resolveFit('')).toBe(Fit.Contain);
    expect(resolveFit('nonsense')).toBe(Fit.Contain);
  });
});

describe('Rive alignment resolution', () => {
  it('maps every documented alignment name', () => {
    expect(resolveAlignment('center')).toBe(Alignment.Center);
    expect(resolveAlignment('topleft')).toBe(Alignment.TopLeft);
    expect(resolveAlignment('top-center')).toBe(Alignment.TopCenter);
    expect(resolveAlignment('bottom_right')).toBe(Alignment.BottomRight);
    expect(resolveAlignment('Center Left')).toBe(Alignment.CenterLeft);
  });

  it('defaults to center', () => {
    expect(resolveAlignment(null)).toBe(Alignment.Center);
    expect(resolveAlignment('nope')).toBe(Alignment.Center);
  });
});

function container(attrs: Record<string, string>): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-animation-type', 'rive');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.appendChild(document.createElement('canvas'));
  return el;
}

describe('reading the container config', () => {
  it('reads the full set of data-rive-* attributes', () => {
    const el = container({
      'data-rive-url': '/assets/rive/chart.riv',
      'data-rive-state-machine': 'State Machine',
      'data-rive-artboard': 'Artboard',
      'data-rive-autoplay': 'true',
      'data-rive-fit': 'contain',
      'data-rive-alignment': 'center',
      'data-rive-is-touch-scroll-enabled': 'false',
      'data-rive-automatically-handle-events': 'false',
    });

    expect(readRiveConfig(el)).toEqual({
      src: '/assets/rive/chart.riv',
      stateMachine: 'State Machine',
      artboard: 'Artboard',
      autoplay: true,
      fit: Fit.Contain,
      alignment: Alignment.Center,
      automaticallyHandleEvents: false,
      isTouchScrollEnabled: false,
    });
  });

  it('returns null without a source URL', () => {
    expect(readRiveConfig(container({}))).toBeNull();
  });

  it('treats any non-"true" autoplay value as false', () => {
    const el = container({ 'data-rive-url': '/a.riv', 'data-rive-autoplay': 'false' });
    expect(readRiveConfig(el)?.autoplay).toBe(false);
  });

  it('leaves optional names undefined when blank', () => {
    const el = container({ 'data-rive-url': '/a.riv' });
    const cfg = readRiveConfig(el);
    expect(cfg?.stateMachine).toBeUndefined();
    expect(cfg?.artboard).toBeUndefined();
  });
});

describe('instantiating a container', () => {
  beforeEach(() => {
    riveInstances.length = 0;
    setWasmUrl.mockClear();
  });

  it('constructs Rive against the canvas with the parsed config', () => {
    const el = container({
      'data-rive-url': '/assets/rive/chart.riv',
      'data-rive-state-machine': 'State Machine',
      'data-rive-artboard': 'Artboard',
      'data-rive-autoplay': 'true',
    });
    document.body.appendChild(el);

    const handle = initRiveContainer(el);
    expect(handle).not.toBeNull();
    expect(riveInstances).toHaveLength(1);

    const props = riveInstances[0].props as Record<string, unknown>;
    expect(props.src).toBe('/assets/rive/chart.riv');
    expect(props.stateMachines).toBe('State Machine');
    expect(props.artboard).toBe('Artboard');
    expect(props.autoplay).toBe(true);
    expect(props.autoBind).toBe(true);
    expect(props.canvas).toBeInstanceOf(HTMLCanvasElement);

    handle?.destroy();
    el.remove();
  });

  it('returns null when the canvas is missing', () => {
    const el = document.createElement('div');
    el.setAttribute('data-rive-url', '/a.riv');
    expect(initRiveContainer(el)).toBeNull();
  });

  it('returns null when the source URL is missing', () => {
    expect(initRiveContainer(container({}))).toBeNull();
  });

  it('resizes the drawing surface once loaded', () => {
    const el = container({ 'data-rive-url': '/a.riv' });
    document.body.appendChild(el);

    const handle = initRiveContainer(el);
    const props = riveInstances[0].props as { onLoad: () => void };
    props.onLoad();

    expect(
      (riveInstances[0] as unknown as { resizeDrawingSurfaceToCanvas: ReturnType<typeof vi.fn> })
        .resizeDrawingSurfaceToCanvas,
    ).toHaveBeenCalled();

    handle?.destroy();
    el.remove();
  });

  it('replays by firing the state machine restart trigger', () => {
    const el = container({
      'data-rive-url': '/a.riv',
      'data-rive-state-machine': 'State Machine',
      'data-rive-artboard': 'Artboard',
    });
    document.body.appendChild(el);

    const handle = initRiveContainer(el);
    // replay() is load-gated: touching the runtime before load hangs the main
    // thread, so onLoad has to fire before a replay reaches it at all.
    (riveInstances[0].props as { onLoad: () => void }).onLoad();
    handle?.replay();

    const instance = riveInstances[0] as unknown as {
      stateMachineInputs: ReturnType<typeof vi.fn>;
      fireTrigger: ReturnType<typeof vi.fn>;
      reset: ReturnType<typeof vi.fn>;
    };

    // The chart animates only when 'onRestart' is fired. reset() must NOT be
    // used: it re-instantiates the artboard back to its idle entry state, which
    // renders the background and nothing else.
    expect(instance.stateMachineInputs).toHaveBeenCalledWith('State Machine');
    expect(instance.fireTrigger).toHaveBeenCalledTimes(1);
    expect(instance.reset).not.toHaveBeenCalled();

    handle?.destroy();
    el.remove();
  });

  it('cleans up the instance on destroy', () => {
    const el = container({ 'data-rive-url': '/a.riv' });
    document.body.appendChild(el);

    const handle = initRiveContainer(el);
    handle?.destroy();

    expect(
      (riveInstances[0] as unknown as { cleanup: ReturnType<typeof vi.fn> }).cleanup,
    ).toHaveBeenCalled();
    el.remove();
  });
});

describe('booting the hero chart on the real markup', () => {
  beforeEach(() => {
    riveInstances.length = 0;
    setWasmUrl.mockClear();
    mountBody();
  });

  afterEach(() => {
    unmountBody();
  });

  it('has exactly one Rive container with a canvas in the ported markup', () => {
    const containers = document.querySelectorAll('[data-animation-type="rive"]');
    expect(containers).toHaveLength(1);
    expect(containers[0].querySelector('canvas')).not.toBeNull();
  });

  it('carries the live site\'s Rive configuration', () => {
    const el = document.querySelector('[data-animation-type="rive"]') as HTMLElement;
    const cfg = readRiveConfig(el);

    expect(cfg?.src).toMatch(/^\/assets\/rive\/.*\.riv$/);
    expect(cfg?.stateMachine).toBe('State Machine');
    expect(cfg?.artboard).toBe('Artboard');
    expect(cfg?.autoplay).toBe(true);
    expect(cfg?.fit).toBe(Fit.Contain);
    expect(cfg?.alignment).toBe(Alignment.Center);
    expect(cfg?.isTouchScrollEnabled).toBe(false);
    expect(cfg?.automaticallyHandleEvents).toBe(false);
  });

  it('points the runtime at the self-hosted WASM before loading', () => {
    const cleanup = initRiveAnimations(document);
    expect(setWasmUrl).toHaveBeenCalledWith(RIVE_WASM_URL);
    expect(RIVE_WASM_URL).toBe('/assets/rive/rive-webgl2.wasm');
    cleanup();
  });

  it('boots the hero chart instance', () => {
    const cleanup = initRiveAnimations(document);
    expect(riveInstances).toHaveLength(1);
    cleanup();
  });

  it('replays when the replay button is clicked', async () => {
    const cleanup = initRiveAnimations(document);
    const button = document.querySelector('.impact__replay-button') as HTMLElement;
    expect(button).not.toBeNull();

    // Let the load-gated auto-replay fire and settle, so the click's own trigger
    // is the only one being counted below. The trigger runs 100ms after the
    // action list starts (Webflow's PLUGIN_RIVE delay), so wait past that.
    (riveInstances[0].props as { onLoad: () => void }).onLoad();
    await new Promise((r) => setTimeout(r, TRIGGER_DELAY_MS + 40));

    const fireTrigger = (riveInstances[0] as unknown as { fireTrigger: ReturnType<typeof vi.fn> })
      .fireTrigger;
    fireTrigger.mockClear();

    button.click();
    await new Promise((r) => setTimeout(r, TRIGGER_DELAY_MS + 40));
    expect(fireTrigger).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('hides the replay button while the chart plays, then restores it', async () => {
    const cleanup = initRiveAnimations(document);
    const button = document.querySelector('.impact__replay-button') as HTMLElement;

    // Mirrors ix2 action list a-4: group 1 hides the button at delay 0, and
    // a-4-n-4/-3 bring it back at delay 1e4 with a 300ms opacity fade.
    expect(button.style.display).toBe('none');
    expect(button.style.opacity).toBe('0');

    vi.useFakeTimers();
    try {
      button.click();
      expect(button.style.display).toBe('none');
      vi.advanceTimersByTime(REVEAL_DELAY_MS + 10);
      expect(button.style.display).toBe('flex');
      expect(button.style.opacity).toBe('1');
      expect(button.style.transition).toContain(`${REVEAL_FADE_MS}ms`);
    } finally {
      vi.useRealTimers();
    }

    cleanup();
  });

  it('auto-replays once the file has loaded, as the original page does', async () => {
    const cleanup = initRiveAnimations(document);
    const instance = riveInstances[0] as unknown as {
      props: { onLoad: () => void };
      fireTrigger: ReturnType<typeof vi.fn>;
    };

    // Regression guard for the bug that stopped the hero chart animating at all:
    // the auto-replay must not touch the runtime before the file has loaded,
    // because reset()/play() on an unloaded instance never returns - it spins
    // forever inside the runtime's task queue and wedges the main thread, so
    // onLoad itself can never fire and nothing is ever drawn.
    await new Promise((r) => setTimeout(r, TRIGGER_DELAY_MS + 40));
    expect(instance.fireTrigger).not.toHaveBeenCalled();

    // Once loaded, the deferred replay is flushed exactly once.
    instance.props.onLoad();
    await new Promise((r) => setTimeout(r, 20));
    expect(instance.fireTrigger).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('detaches the replay handler on cleanup', async () => {
    const cleanup = initRiveAnimations(document);
    const button = document.querySelector('.impact__replay-button') as HTMLElement;
    const fireTrigger = (riveInstances[0] as unknown as { fireTrigger: ReturnType<typeof vi.fn> })
      .fireTrigger;

    cleanup();
    fireTrigger.mockClear();
    button.click();
    await new Promise((r) => setTimeout(r, TRIGGER_DELAY_MS + 40));

    expect(fireTrigger).not.toHaveBeenCalled();
  });

  it('is a no-op on markup with no Rive containers', () => {
    const empty = document.createElement('div');
    expect(() => initRiveAnimations(empty)()).not.toThrow();
  });
});
