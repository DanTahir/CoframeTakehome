import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initCursorRetypeAnimation } from '@/app/effects/CursorRetypeAnimation';

/**
 * Exercises the ported cursor/retype engine end to end against the same DOM
 * shape the live hero uses (see scrape/sections/hero.html).
 *
 * The IntersectionObserver stub in tests/setup.ts fires synchronously on
 * observe(), so the entrance sequence starts as soon as the effect mounts.
 */
const ORIGINAL_TEXT = 'Coframe creates and tests variations of your website, improving 24/7.';
const VERSION_1 = 'The most powerful way to increase website conversion.';
const VERSION_2 = 'Drive more conversion with AI-powered CRO.';
const VERSION_3 = 'The future of conversion optimization.';

function mountHero(overrides: Record<string, string> = {}) {
  const settings: Record<string, string> = {
    'data-animation-duration': '800',
    'data-animation-delay': '0',
    'data-animation-retype': 'true',
    'data-animation-retype-loop': 'true',
    'data-animation-vertical-side': 'bottom',
    'data-animation-vertical-start-distance': '-100',
    'data-animation-horizontal-side': 'right',
    'data-animation-horizontal-start-distance': '-100',
    ...overrides,
  };

  const settingsAttrs = Object.entries(settings)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

  document.body.innerHTML = `
    <section class="hero">
      <div class="cursor-animation">
        <div ${settingsAttrs} class="cursor-animation__settings"></div>
        <div class="hero__title-wrap">
          <div class="cursor-animation__content-wrap">
            <h1 data-retype-text="true"
                data-retype-version-1="${VERSION_1}"
                data-retype-version-2="${VERSION_2}"
                data-retype-version-3="${VERSION_3}"
                class="heading-4">${ORIGINAL_TEXT}</h1>
          </div>
          <div class="tag"><div>header</div></div>
          <div class="metric-wrap">
            <div data-metric-direction="top" class="metric">
              <div class="metric__number">14%</div>
            </div>
          </div>
          <div class="hero__title-cursor-wrap">
            <div class="cursor"><div id="cursor__text">Coframe</div></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

const heading = () => document.querySelector<HTMLElement>('[data-retype-text="true"]')!;
const headingText = () => heading().textContent ?? '';

/**
 * Advances fake timers in small steps, recording each distinct fully-settled
 * headline as the retype loop runs. Intermediate word-by-word fade states are
 * prefixes of the real copy, so filtering against the known set of headlines
 * yields just the settled sequence.
 */
async function recordHeadlines(steps: number, stepMs = 100): Promise<string[]> {
  const known = [ORIGINAL_TEXT, VERSION_1, VERSION_2, VERSION_3];
  const seen: string[] = [];

  for (let i = 0; i < steps; i++) {
    const text = headingText();
    if (known.includes(text) && seen[seen.length - 1] !== text) seen.push(text);
    await vi.advanceTimersByTimeAsync(stepMs);
  }

  return seen;
}

describe('cursor retype animation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mountHero();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('wraps the initial headline into per-word .letter-effect spans', () => {
    const cleanup = initCursorRetypeAnimation();

    const spans = heading().querySelectorAll('span.letter-effect');
    expect(spans.length).toBe(ORIGINAL_TEXT.split(' ').length);
    // Wrapping must not change the rendered copy.
    expect(headingText()).toBe(ORIGINAL_TEXT);
    spans.forEach((span) => expect(span.classList.contains('visible')).toBe(true));

    cleanup();
  });

  it('animates the content wrap in from the configured offset', () => {
    const cleanup = initCursorRetypeAnimation();
    const content = document.querySelector<HTMLElement>('.hero__title-wrap')!;

    // bottom/right with distance -100 => starts +100px down and right.
    expect(content.style.transform).toBe('translate(100px, 100px)');

    cleanup();
  });

  it('reveals the container and settles the content after the entrance', async () => {
    const cleanup = initCursorRetypeAnimation();
    const container = document.querySelector<HTMLElement>('.cursor-animation')!;
    const content = document.querySelector<HTMLElement>('.hero__title-wrap')!;

    expect(container.style.opacity).toBe('1');

    await vi.advanceTimersByTimeAsync(800);

    expect(content.style.transform).toBe('');
    expect(content.style.opacity).toBe('1');

    cleanup();
  });

  it('hides the tag and clears the border once the entrance finishes', async () => {
    const cleanup = initCursorRetypeAnimation();
    const tag = document.querySelector<HTMLElement>('.tag')!;

    await vi.advanceTimersByTimeAsync(800 + 200);

    expect(tag.style.opacity).toBe('0');
    cleanup();
  });

  it('pops the metric badge with a percentage from the first stage', async () => {
    const cleanup = initCursorRetypeAnimation();
    const metric = document.querySelector<HTMLElement>('.metric')!;
    const number = document.querySelector<HTMLElement>('.metric__number')!;

    await vi.advanceTimersByTimeAsync(800 + 200 + 5);

    expect(metric.style.opacity).toBe('1');
    expect(metric.style.top).toBe('-42px');

    const value = Number.parseInt(number.textContent ?? '', 10);
    expect(value).toBeGreaterThanOrEqual(10);
    expect(value).toBeLessThanOrEqual(15);

    // ...then retracts after its 2s dwell.
    await vi.advanceTimersByTimeAsync(2000);
    expect(metric.style.opacity).toBe('0');
    expect(metric.style.top).toBe('0px');

    cleanup();
  });

  it('retypes the headline to version 2 first', async () => {
    const cleanup = initCursorRetypeAnimation();

    // Entrance (800) + settle (200) + dwell (4000), then the retype cycle:
    // fade out ~11 words * 180ms, 500ms gap, fade in ~7 words * 180ms.
    await vi.advanceTimersByTimeAsync(12000);

    expect(headingText()).toBe(VERSION_2);
    cleanup();
  });

  it('cycles version 2 -> 3 -> 1, preserving the original ordering', async () => {
    const cleanup = initCursorRetypeAnimation();

    // Sample the headline as the loop runs and record only fully-settled copy,
    // so partially faded word-by-word states are ignored. This avoids pinning
    // the test to an exact cycle duration.
    const seen = await recordHeadlines(400);

    expect(seen[0]).toBe(ORIGINAL_TEXT);
    // currentVersion starts at 1 and the engine reads version n+1, so the
    // visible order is v2 -> v3 -> v1 (deliberately preserved off-by-one).
    expect(seen.slice(1, 4)).toEqual([VERSION_2, VERSION_3, VERSION_1]);

    cleanup();
  });

  it('re-wraps each new headline into word spans', async () => {
    const cleanup = initCursorRetypeAnimation();

    await vi.advanceTimersByTimeAsync(12000);

    const spans = heading().querySelectorAll('span.letter-effect');
    expect(spans.length).toBe(VERSION_2.split(' ').length);
    spans.forEach((span) => expect(span.classList.contains('visible')).toBe(true));

    cleanup();
  });

  it('stops retyping when the loop is disabled', async () => {
    document.body.innerHTML = '';
    mountHero({ 'data-animation-retype-loop': 'false' });
    const cleanup = initCursorRetypeAnimation();

    const seen = await recordHeadlines(400);

    // Version 3 is the last one, so it must stay put rather than wrap to v1.
    expect(seen).toEqual([ORIGINAL_TEXT, VERSION_2, VERSION_3]);
    expect(headingText()).toBe(VERSION_3);

    cleanup();
  });

  it('leaves the headline alone when retyping is switched off', async () => {
    document.body.innerHTML = '';
    mountHero({ 'data-animation-retype': 'false' });
    const cleanup = initCursorRetypeAnimation();

    await vi.advanceTimersByTimeAsync(30000);

    expect(headingText()).toBe(ORIGINAL_TEXT);
    cleanup();
  });

  it('honours the configured entrance delay', async () => {
    document.body.innerHTML = '';
    mountHero({ 'data-animation-delay': '1000' });
    const cleanup = initCursorRetypeAnimation();
    const content = document.querySelector<HTMLElement>('.hero__title-wrap')!;

    // Still parked at the start offset while the delay runs.
    await vi.advanceTimersByTimeAsync(500);
    expect(content.style.transform).toBe('translate(100px, 100px)');

    await vi.advanceTimersByTimeAsync(600);
    expect(content.style.transform).toBe('translate(0, 0)');

    cleanup();
  });

  it('halts all pending work after cleanup', async () => {
    const cleanup = initCursorRetypeAnimation();
    cleanup();

    await vi.advanceTimersByTimeAsync(60000);

    // Never advanced past the initial copy.
    expect(headingText()).toBe(ORIGINAL_TEXT);
  });

  it('does nothing on a page with no cursor animations', () => {
    document.body.innerHTML = '<main><p>no animation here</p></main>';
    expect(() => initCursorRetypeAnimation()()).not.toThrow();
  });
});
