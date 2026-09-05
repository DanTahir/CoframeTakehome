/**
 * Animation constants and helpers ported 1:1 from the coframe.com inline
 * animation engine (scrape/scripts/26-cursor-animation-script-2.js).
 *
 * Keeping these in one place makes the reimplementation auditable against the
 * original source — every value below appears verbatim in the scraped script.
 */

/** Horizontal random travel range for the collaborator cursor, in px. */
export const RANDOM_POSITION_RANGE_X = { MIN: 50, MAX: 300 } as const;

/** Vertical random travel range for the collaborator cursor, in px. */
export const RANDOM_POSITION_RANGE_Y = { MIN: 50, MAX: 150 } as const;

/** Cursor opacity fade duration, in ms. */
export const FADE_OUT_DURATION = 200;

/** Pause between fading the old headline out and typing the new one, in ms. */
export const RETYPE_GAP = 500;

/** Dwell time on a finished headline before the next variation, in ms. */
export const RETYPE_DWELL = 4000;

/** How long the metric badge stays on screen, in ms. */
export const METRIC_VISIBLE_MS = 2000;

/** Metric badge rise distance, in px. */
export const METRIC_RISE_PX = -42;

/** Webflow's tablet breakpoint: below this the `-mobile` data attrs are used. */
export const MOBILE_MAX_WIDTH = 991;

/** IntersectionObserver thresholds used to kick off the hero animation. */
export const OBSERVER_THRESHOLD_DESKTOP = 0.8;
export const OBSERVER_THRESHOLD_MOBILE = 0.5;

/** Per-word stagger as a fraction of --letter-effect-duration. */
export const LETTER_STAGGER_RATIO = 0.3;

/** Fallback for --letter-effect-duration when CSS has not loaded yet, in ms. */
export const LETTER_EFFECT_FALLBACK_MS = 600;

/** Percentage ranges the metric badge cycles through, per stage. */
export const METRIC_STAGES = [
  { min: 10, max: 15 },
  { min: 16, max: 20 },
  { min: 21, max: 25 },
  { min: 20, max: 30 },
] as const;

export function getRandomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** Mirrors getRandomPercentage(stage) from the original script. */
export function getRandomPercentage(stage: number): number {
  const { min, max } = METRIC_STAGES[Math.min(stage - 1, METRIC_STAGES.length - 1)];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Reads a CSS time custom property (e.g. `--letter-effect-duration`) as ms. */
export function getCssVariableDuration(element: Element, variableName: string): number {
  const styles = getComputedStyle(element);
  const duration = parseFloat(styles.getPropertyValue(variableName)) * 1000;
  return duration || LETTER_EFFECT_FALLBACK_MS;
}

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= MOBILE_MAX_WIDTH;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export type Side = 'top' | 'bottom' | 'left' | 'right' | null;

/**
 * Ported from getAllowedMovementRange() — clamps the random cursor travel so
 * the cursor never flies outside the viewport.
 */
export function getAllowedMovementRange(
  rect: DOMRect,
  viewport: { width: number; height: number },
  side: Side,
  axis: 'X' | 'Y',
  minRange: number,
  maxRange: number,
): { minMovement: number; maxMovement: number } {
  let maxMovement = 0;

  if (axis === 'X') {
    if (side === 'left') maxMovement = rect.left;
    else if (side === 'right') maxMovement = viewport.width - rect.right;
  } else if (axis === 'Y') {
    if (side === 'top') maxMovement = rect.top;
    else if (side === 'bottom') maxMovement = viewport.height - rect.bottom;
  }

  maxMovement = Math.max(0, maxMovement);
  maxMovement = Math.min(maxMovement, maxRange);
  const minMovement = Math.min(minRange, maxMovement);

  return { minMovement, maxMovement };
}

/**
 * Ported from calculateCursorMovement() — picks a random offset on the
 * configured side, clamped to the viewport.
 */
export function calculateCursorMovement(
  cursor: HTMLElement,
  horizontalSide: Side,
  verticalSide: Side,
): { moveX: number; moveY: number } {
  const rect = cursor.getBoundingClientRect();
  const viewport = { width: window.innerWidth, height: window.innerHeight };

  let moveX = 0;
  let moveY = 0;

  if (horizontalSide) {
    const { minMovement, maxMovement } = getAllowedMovementRange(
      rect,
      viewport,
      horizontalSide,
      'X',
      RANDOM_POSITION_RANGE_X.MIN,
      RANDOM_POSITION_RANGE_X.MAX,
    );
    if (maxMovement > 0) {
      const randomX = getRandomInRange(minMovement, maxMovement);
      moveX = horizontalSide === 'left' ? -randomX : randomX;
    }
  }

  if (verticalSide) {
    const { minMovement, maxMovement } = getAllowedMovementRange(
      rect,
      viewport,
      verticalSide,
      'Y',
      RANDOM_POSITION_RANGE_Y.MIN,
      RANDOM_POSITION_RANGE_Y.MAX,
    );
    if (maxMovement > 0) {
      const randomY = getRandomInRange(minMovement, maxMovement);
      moveY = verticalSide === 'top' ? -randomY : randomY;
    }
  }

  return { moveX, moveY };
}

export function calculateDistance(x: number, y: number): number {
  return Math.sqrt(x ** 2 + y ** 2);
}

/**
 * Ported from setupCursorTransition() — transform runs for `duration`, while
 * opacity fades over the final FADE_OUT_DURATION ms.
 */
export function cursorTransition(duration: number): string {
  const fadeOutDelay = Math.max(0, duration - FADE_OUT_DURATION);
  return (
    `transform ${duration}ms var(--easing-cubic-bezier), ` +
    `opacity ${FADE_OUT_DURATION}ms var(--easing-cubic-bezier) ${fadeOutDelay}ms`
  );
}

/**
 * Translates the Webflow `data-animation-*-side` + `*-start-distance` pair into
 * a translate offset.
 *
 * The original animates an absolutely positioned clone by setting
 * `style[side] = distance + 'px'` and transitioning it to 0. Offsetting the
 * real element by the equivalent translate is visually identical but avoids
 * cloning the subtree (and the layout thrash that comes with it).
 */
export function startOffsetFor(side: Side, distance: number): number {
  if (side === 'right' || side === 'bottom') return -distance;
  if (side === 'left' || side === 'top') return distance;
  return 0;
}

/** A cancellable sleep, so effects can bail out cleanly on unmount. */
export class Timeline {
  private cancelled = false;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  get isCancelled(): boolean {
    return this.cancelled;
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.cancelled) return;
      const id = setTimeout(() => {
        this.timers.delete(id);
        if (!this.cancelled) resolve();
      }, ms);
      this.timers.add(id);
    });
  }

  cancel(): void {
    this.cancelled = true;
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
  }
}
