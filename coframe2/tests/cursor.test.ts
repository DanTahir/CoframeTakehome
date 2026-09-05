// The multiplayer-cursor / retype animation engine's pure helpers, plus the
// cursor name randomiser and the #cursor-container size sync.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FADE_OUT_DURATION,
  RANDOM_POSITION_RANGE_X,
  RANDOM_POSITION_RANGE_Y,
  calculateDistance,
  ensurePixelSuffix,
  getAllowedMovementRange,
  getCssVariableDuration,
  getRandomInRange,
  getRandomPercentage,
  getTranslateValues,
  hasNukedHeroAnimations,
  resetEngineState,
  startCursorAnimations,
  toggleTextAnimation,
  typeText,
  wrapWordsInSpans,
} from '../app/lib/cursorAnimation';
import { CURSOR_NAMES, initCursorNames } from '../app/lib/cursorNames';
import { initCursorContainer } from '../app/lib/cursorContainer';
import { mountBody, unmountBody } from './helpers';
import { resetObservers } from './setup';

describe('cursor engine numeric helpers', () => {
  it('keeps getRandomInRange within bounds', () => {
    for (let i = 0; i < 200; i++) {
      const v = getRandomInRange(10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(20);
    }
  });

  it('returns the bound exactly for a zero-width range', () => {
    expect(getRandomInRange(7, 7)).toBe(7);
  });

  it('computes euclidean distance', () => {
    expect(calculateDistance(3, 4)).toBe(5);
    expect(calculateDistance(0, 0)).toBe(0);
    expect(calculateDistance(-3, -4)).toBe(5);
  });

  it('carries the original movement ranges and fade duration', () => {
    expect(RANDOM_POSITION_RANGE_X).toEqual({ MIN: 50, MAX: 300 });
    expect(RANDOM_POSITION_RANGE_Y).toEqual({ MIN: 50, MAX: 150 });
    expect(FADE_OUT_DURATION).toBe(200);
  });

  it('appends px only when missing', () => {
    expect(ensurePixelSuffix('12')).toBe('12px');
    expect(ensurePixelSuffix('12px')).toBe('12px');
    expect(ensurePixelSuffix('0')).toBe('0px');
  });
});

describe('metric percentage staging', () => {
  it('escalates through the original stage ranges', () => {
    const bounds = [
      { stage: 1, min: 10, max: 15 },
      { stage: 2, min: 16, max: 20 },
      { stage: 3, min: 21, max: 25 },
      { stage: 4, min: 20, max: 30 },
    ];
    for (const { stage, min, max } of bounds) {
      for (let i = 0; i < 50; i++) {
        const v = getRandomPercentage(stage);
        expect(v, `stage ${stage}`).toBeGreaterThanOrEqual(min);
        expect(v, `stage ${stage}`).toBeLessThanOrEqual(max);
      }
    }
  });

  it('clamps stages past the last bucket to the final range', () => {
    for (let i = 0; i < 50; i++) {
      const v = getRandomPercentage(99);
      expect(v).toBeGreaterThanOrEqual(20);
      expect(v).toBeLessThanOrEqual(30);
    }
  });

  it('returns whole numbers', () => {
    for (let i = 0; i < 20; i++) {
      expect(Number.isInteger(getRandomPercentage(1))).toBe(true);
    }
  });
});

describe('allowed movement range', () => {
  const viewport = { width: 1000, height: 800 };

  it('limits leftward travel to the distance to the left edge', () => {
    const rect = { left: 120, right: 200, top: 100, bottom: 140 };
    const { minMovement, maxMovement } = getAllowedMovementRange(
      rect, viewport, 'left', 'X', 50, 300,
    );
    expect(maxMovement).toBe(120);
    expect(minMovement).toBe(50);
  });

  it('limits rightward travel to the distance to the right edge', () => {
    const rect = { left: 900, right: 950, top: 100, bottom: 140 };
    const { maxMovement } = getAllowedMovementRange(rect, viewport, 'right', 'X', 50, 300);
    expect(maxMovement).toBe(50);
  });

  it('caps travel at the configured maximum', () => {
    const rect = { left: 900, right: 950, top: 100, bottom: 140 };
    const { maxMovement } = getAllowedMovementRange(rect, viewport, 'left', 'X', 50, 300);
    expect(maxMovement).toBe(300);
  });

  it('handles the vertical axis', () => {
    const rect = { left: 0, right: 50, top: 90, bottom: 130 };
    expect(getAllowedMovementRange(rect, viewport, 'top', 'Y', 50, 150).maxMovement).toBe(90);
    expect(getAllowedMovementRange(rect, viewport, 'bottom', 'Y', 50, 150).maxMovement).toBe(150);
  });

  it('never returns a negative range for an off-screen cursor', () => {
    const rect = { left: -80, right: -20, top: -50, bottom: -10 };
    const { minMovement, maxMovement } = getAllowedMovementRange(
      rect, viewport, 'left', 'X', 50, 300,
    );
    expect(maxMovement).toBe(0);
    expect(minMovement).toBe(0);
  });

  it('yields no movement for an unknown side', () => {
    const rect = { left: 100, right: 150, top: 100, bottom: 140 };
    expect(getAllowedMovementRange(rect, viewport, null, 'X', 50, 300).maxMovement).toBe(0);
  });

  it('never lets minMovement exceed maxMovement', () => {
    const rect = { left: 10, right: 60, top: 100, bottom: 140 };
    const { minMovement, maxMovement } = getAllowedMovementRange(
      rect, viewport, 'left', 'X', 50, 300,
    );
    expect(minMovement).toBeLessThanOrEqual(maxMovement);
  });
});

describe('CSS-variable durations', () => {
  it('falls back to 600ms when the variable is absent', () => {
    const node = document.createElement('div');
    document.body.appendChild(node);
    expect(getCssVariableDuration(node, '--does-not-exist')).toBe(600);
    node.remove();
  });
});

describe('text animation helpers', () => {
  it('toggles in and out class sets symmetrically', () => {
    const node = document.createElement('span');

    toggleTextAnimation(node, 'in');
    expect(node.classList.contains('visible')).toBe(true);
    expect(node.classList.contains('animate-in')).toBe(true);
    expect(node.classList.contains('hidden')).toBe(false);

    toggleTextAnimation(node, 'out');
    expect(node.classList.contains('hidden')).toBe(true);
    expect(node.classList.contains('animate-out')).toBe(true);
    expect(node.classList.contains('visible')).toBe(false);
  });

  it('wraps each word in its own span with the given classes', () => {
    const host = document.createElement('div');
    const spans = wrapWordsInSpans(host, 'grow your revenue', ['letter-effect', 'hidden']);

    expect(spans).toHaveLength(3);
    expect(host.querySelectorAll('span')).toHaveLength(3);
    expect(spans.map((s) => s.textContent)).toEqual(['grow', 'your', 'revenue']);
    expect(spans[0].classList.contains('letter-effect')).toBe(true);
    expect(spans[0].classList.contains('hidden')).toBe(true);
  });

  it('preserves spacing between words', () => {
    const host = document.createElement('div');
    wrapWordsInSpans(host, 'a b c', ['x']);
    expect(host.textContent).toBe('a b c');
  });

  it('replaces prior content on each call', () => {
    const host = document.createElement('div');
    host.innerHTML = '<em>old</em>';
    wrapWordsInSpans(host, 'new text', ['x']);
    expect(host.querySelector('em')).toBeNull();
    expect(host.textContent).toBe('new text');
  });

  it('handles a single word', () => {
    const host = document.createElement('div');
    expect(wrapWordsInSpans(host, 'solo', ['x'])).toHaveLength(1);
  });
});

describe('typeText', () => {
  beforeEach(() => {
    resetEngineState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetEngineState();
  });

  it('types in chunks and shows a caret mid-flight', () => {
    const node = document.createElement('h2');
    typeText(node, 'abcdef', 0, 10, 3, false);

    expect(node.innerHTML).toContain('abc');
    expect(node.innerHTML).toContain('thin-cursor');
  });

  it('finishes with the clean full text and fires the callback', () => {
    const node = document.createElement('h2');
    const done = vi.fn();

    typeText(node, 'abcdef', 0, 10, 3, false, done);
    vi.advanceTimersByTime(200);

    expect(node.innerHTML).toBe('abcdef');
    expect(node.textContent).toBe('abcdef');
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('marks the caret resettable when the run is nukeable', () => {
    const node = document.createElement('h2');
    typeText(node, 'abcdef', 0, 10, 3, true);
    expect(node.innerHTML).toContain('data-should-reset="true"');
  });

  it('does nothing for empty text', () => {
    const node = document.createElement('h2');
    const done = vi.fn();
    typeText(node, '', 0, 10, 3, false, done);
    expect(node.innerHTML).toBe('');
    expect(done).not.toHaveBeenCalled();
  });
});

describe('engine state', () => {
  it('starts un-nuked and resets cleanly', () => {
    resetEngineState();
    expect(hasNukedHeroAnimations()).toBe(false);
  });
});

describe('getTranslateValues', () => {
  it('returns zeros for an untransformed element', () => {
    const node = document.createElement('div');
    document.body.appendChild(node);
    expect(getTranslateValues(node)).toEqual({ x: 0, y: 0 });
    node.remove();
  });

  it('never throws on an unparseable transform', () => {
    const node = document.createElement('div');
    node.style.transform = 'not-a-matrix';
    document.body.appendChild(node);
    expect(() => getTranslateValues(node)).not.toThrow();
    node.remove();
  });
});

describe('cursor names', () => {
  beforeEach(() => mountBody());
  afterEach(() => unmountBody());

  it('carries the original name list', () => {
    expect(CURSOR_NAMES).toContain('James');
    expect(CURSOR_NAMES).toContain('Jessica');
    expect(CURSOR_NAMES.length).toBe(18);
  });

  it('labels the non-Coframe cursors with a name from the list', () => {
    initCursorNames(document);

    const labels = Array.from(
      document.querySelectorAll('.cursor[data-is-coframe-cursor="false"] #cursor__text'),
    ).map((n) => n.textContent);

    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(CURSOR_NAMES).toContain(label as string);
    }
  });

  it('uses one consistent name within a single cursor-animation', () => {
    initCursorNames(document);

    document.querySelectorAll('.cursor-animation').forEach((group) => {
      const names = new Set(
        Array.from(
          group.querySelectorAll('.cursor[data-is-coframe-cursor="false"] #cursor__text'),
        ).map((n) => n.textContent),
      );
      expect(names.size).toBeLessThanOrEqual(1);
    });
  });

  it('leaves the Coframe cursor labels untouched', () => {
    const before = Array.from(
      document.querySelectorAll('.cursor[data-is-coframe-cursor="true"] #cursor__text'),
    ).map((n) => n.textContent);

    initCursorNames(document);

    const after = Array.from(
      document.querySelectorAll('.cursor[data-is-coframe-cursor="true"] #cursor__text'),
    ).map((n) => n.textContent);

    expect(after).toEqual(before);
  });

  it('is a no-op on markup with no cursors', () => {
    const empty = document.createElement('div');
    expect(() => initCursorNames(empty)).not.toThrow();
  });
});

describe('cursor container sizing', () => {
  beforeEach(() => {
    resetObservers();
    mountBody();
  });

  afterEach(() => {
    unmountBody();
    resetObservers();
  });

  it('finds the container in the ported markup', () => {
    expect(document.querySelector('#cursor-container')).toBeInstanceOf(HTMLElement);
  });

  it('sizes the container in pixels on init', () => {
    const cleanup = initCursorContainer(document);
    const container = document.querySelector('#cursor-container') as HTMLElement;

    expect(container.style.width).toMatch(/px$/);
    expect(container.style.height).toMatch(/px$/);

    cleanup();
  });

  it('observes body and documentElement for resizes', () => {
    const cleanup = initCursorContainer(document);
    expect(globalThis.__resizeObserverCount).toBeGreaterThan(0);
    cleanup();
  });

  it('re-syncs on window resize', () => {
    const cleanup = initCursorContainer(document);
    const container = document.querySelector('#cursor-container') as HTMLElement;

    // jsdom performs no layout, so scrollWidth/scrollHeight are 0 and the synced
    // size is legitimately '0px'. Assert against the value the sync should
    // produce rather than assuming it is non-zero.
    const expectedWidth = `${Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
    )}px`;

    container.style.width = '4321px';
    window.dispatchEvent(new Event('resize'));

    expect(container.style.width).toBe(expectedWidth);
    cleanup();
  });

  it('stops syncing after cleanup', () => {
    const cleanup = initCursorContainer(document);
    const container = document.querySelector('#cursor-container') as HTMLElement;
    cleanup();

    container.style.width = '4321px';
    window.dispatchEvent(new Event('resize'));

    expect(container.style.width).toBe('4321px');
  });

  it('is a no-op without a container', () => {
    const empty = document.createElement('div');
    expect(() => initCursorContainer(empty)()).not.toThrow();
  });
});

describe('cursor animation bootstrapping', () => {
  beforeEach(() => {
    resetObservers();
    resetEngineState();
    mountBody();
  });

  afterEach(() => {
    unmountBody();
    resetObservers();
    resetEngineState();
  });

  it('finds cursor-animation groups in the ported markup', () => {
    expect(document.querySelectorAll('.cursor-animation').length).toBeGreaterThan(0);
  });

  it('arms an observer per cursor-animation without throwing', () => {
    const cleanup = startCursorAnimations(document);
    expect(globalThis.__intersectionObservers.length).toBeGreaterThan(0);
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('is a no-op on markup with no cursor animations', () => {
    const empty = document.createElement('div');
    expect(() => startCursorAnimations(empty)()).not.toThrow();
  });
});
