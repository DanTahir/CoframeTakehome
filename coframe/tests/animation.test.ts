import { describe, expect, it, vi } from 'vitest';
import {
  FADE_OUT_DURATION,
  METRIC_STAGES,
  RANDOM_POSITION_RANGE_X,
  RANDOM_POSITION_RANGE_Y,
  Timeline,
  calculateDistance,
  cursorTransition,
  getAllowedMovementRange,
  getRandomInRange,
  getRandomPercentage,
  isMobileViewport,
  startOffsetFor,
} from '@/app/effects/animation';

/**
 * These assert the maths ported from the live site's inline animation engine
 * (scrape/scripts/26-cursor-animation-script-2.js). Constants and formulas are
 * pinned so a future refactor cannot silently change the motion design.
 */
describe('animation constants match the original engine', () => {
  it('uses the original random travel ranges', () => {
    expect(RANDOM_POSITION_RANGE_X).toEqual({ MIN: 50, MAX: 300 });
    expect(RANDOM_POSITION_RANGE_Y).toEqual({ MIN: 50, MAX: 150 });
  });

  it('fades the cursor over 200ms', () => {
    expect(FADE_OUT_DURATION).toBe(200);
  });

  it('keeps the four metric percentage stages', () => {
    expect(METRIC_STAGES).toEqual([
      { min: 10, max: 15 },
      { min: 16, max: 20 },
      { min: 21, max: 25 },
      { min: 20, max: 30 },
    ]);
  });
});

describe('getRandomInRange', () => {
  it('returns the minimum when Math.random() is 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(getRandomInRange(50, 300)).toBe(50);
    vi.restoreAllMocks();
  });

  it('interpolates linearly', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(getRandomInRange(0, 100)).toBe(50);
    vi.restoreAllMocks();
  });
});

describe('getRandomPercentage', () => {
  it('produces a value inside the requested stage', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(getRandomPercentage(1)).toBe(10);
    expect(getRandomPercentage(2)).toBe(16);
    expect(getRandomPercentage(3)).toBe(21);
    expect(getRandomPercentage(4)).toBe(20);
    vi.restoreAllMocks();
  });

  it('clamps stages beyond the last one to the final stage', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    expect(getRandomPercentage(99)).toBe(30);
    vi.restoreAllMocks();
  });

  it('always lands within the stage bounds across many draws', () => {
    for (let i = 0; i < 500; i += 1) {
      const value = getRandomPercentage(1);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThanOrEqual(15);
    }
  });
});

describe('getAllowedMovementRange', () => {
  const viewport = { width: 1000, height: 800 };
  const rect = { left: 400, right: 600, top: 300, bottom: 500 } as DOMRect;

  it('clamps horizontal travel to the space available on that side', () => {
    // 400px of room on the left, but the configured max is 300.
    expect(getAllowedMovementRange(rect, viewport, 'left', 'X', 50, 300)).toEqual({
      minMovement: 50,
      maxMovement: 300,
    });
  });

  it('never exceeds the actual gap to the viewport edge', () => {
    const tight = { left: 10, right: 990, top: 5, bottom: 795 } as DOMRect;
    // Only 10px of room on the left, so both bounds collapse to 10.
    expect(getAllowedMovementRange(tight, viewport, 'left', 'X', 50, 300)).toEqual({
      minMovement: 10,
      maxMovement: 10,
    });
  });

  it('clamps vertical travel using top/bottom', () => {
    expect(getAllowedMovementRange(rect, viewport, 'top', 'Y', 50, 150)).toEqual({
      minMovement: 50,
      maxMovement: 150,
    });
    // 800 - 500 = 300px below, capped at the 150 max range.
    expect(getAllowedMovementRange(rect, viewport, 'bottom', 'Y', 50, 150)).toEqual({
      minMovement: 50,
      maxMovement: 150,
    });
  });

  it('never returns a negative range for off-screen elements', () => {
    const offscreen = { left: -200, right: 1200, top: -50, bottom: 900 } as DOMRect;
    const result = getAllowedMovementRange(offscreen, viewport, 'right', 'X', 50, 300);
    expect(result.maxMovement).toBe(0);
    expect(result.minMovement).toBe(0);
  });

  it('returns zero for a null side', () => {
    expect(getAllowedMovementRange(rect, viewport, null, 'X', 50, 300)).toEqual({
      minMovement: 0,
      maxMovement: 0,
    });
  });
});

describe('calculateDistance', () => {
  it('is euclidean', () => {
    expect(calculateDistance(3, 4)).toBe(5);
    expect(calculateDistance(0, 0)).toBe(0);
    expect(calculateDistance(-3, -4)).toBe(5);
  });
});

describe('cursorTransition', () => {
  it('delays the opacity fade to the end of the movement', () => {
    const css = cursorTransition(1000);
    expect(css).toContain('transform 1000ms var(--easing-cubic-bezier)');
    // 1000 - 200 = 800ms delay before the 200ms fade.
    expect(css).toContain('opacity 200ms var(--easing-cubic-bezier) 800ms');
  });

  it('never produces a negative delay for very short movements', () => {
    expect(cursorTransition(50)).toContain('opacity 200ms var(--easing-cubic-bezier) 0ms');
  });
});

describe('startOffsetFor', () => {
  it('inverts the sign for right/bottom entries', () => {
    // The hero uses distance -100 from the bottom-right, i.e. it slides up-left
    // into place from +100px away.
    expect(startOffsetFor('bottom', -100)).toBe(100);
    expect(startOffsetFor('right', -100)).toBe(100);
  });

  it('keeps the sign for left/top entries', () => {
    expect(startOffsetFor('top', -100)).toBe(-100);
    expect(startOffsetFor('left', 100)).toBe(100);
  });

  it('returns 0 when no side is configured', () => {
    expect(startOffsetFor(null, 100)).toBe(0);
  });
});

describe('isMobileViewport', () => {
  it('uses Webflow\u2019s 991px tablet breakpoint', () => {
    const original = window.innerWidth;

    Object.defineProperty(window, 'innerWidth', { value: 991, configurable: true });
    expect(isMobileViewport()).toBe(true);

    Object.defineProperty(window, 'innerWidth', { value: 992, configurable: true });
    expect(isMobileViewport()).toBe(false);

    Object.defineProperty(window, 'innerWidth', { value: original, configurable: true });
  });
});

describe('Timeline', () => {
  it('resolves sleeps in order', async () => {
    vi.useFakeTimers();
    const timeline = new Timeline();
    const seen: number[] = [];

    void (async () => {
      await timeline.sleep(100);
      seen.push(1);
      await timeline.sleep(100);
      seen.push(2);
    })();

    await vi.advanceTimersByTimeAsync(100);
    expect(seen).toEqual([1]);

    await vi.advanceTimersByTimeAsync(100);
    expect(seen).toEqual([1, 2]);

    vi.useRealTimers();
  });

  it('stops pending work once cancelled', async () => {
    vi.useFakeTimers();
    const timeline = new Timeline();
    const seen: string[] = [];

    void (async () => {
      await timeline.sleep(100);
      seen.push('should not run');
    })();

    timeline.cancel();
    await vi.advanceTimersByTimeAsync(1000);

    expect(seen).toEqual([]);
    expect(timeline.isCancelled).toBe(true);

    vi.useRealTimers();
  });
});
