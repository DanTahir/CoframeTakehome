/**
 * Two small cursor-layer behaviours.
 *
 *  1. `initCoframeCursorNames` — ported from `scrape/analysis/script-22.js`:
 *     every non-Coframe cursor in a group gets the same random first name.
 *  2. `initCoframeCursorContainer` — ported from `script-23.js`: keeps the
 *     full-document `#cursor-container` overlay sized to the document.
 */
import { $all, type Teardown } from './runtime';

/** Upstream's name pool, verbatim. */
const NAMES = [
  'James', 'Josh', 'Liam', 'Oliver', 'Noah', 'William', 'Ben', 'Henry', 'Alex',
  'Olivia', 'Emma', 'Sarah', 'Elizabeth', 'Laura', 'Anna', 'Rachel', 'Rebecca',
  'Jessica',
];

export function initCoframeCursorNames(root: ParentNode = document): Teardown | void {
  const cursorAnimations = $all<HTMLElement>('.cursor-animation', root);
  if (!cursorAnimations.length) return;

  for (const cursorAnimation of cursorAnimations) {
    const cursors = $all<HTMLElement>('.cursor[data-is-coframe-cursor="false"]', cursorAnimation);
    if (!cursors.length) continue;

    const randomName = NAMES[Math.floor(Math.random() * NAMES.length)];
    for (const cursor of cursors) {
      // Upstream queries by id; the markup repeats that id per cursor, so a
      // scoped querySelector (first match within each cursor) is equivalent.
      const cursorTextElement = cursor.querySelector<HTMLElement>('#cursor__text');
      if (cursorTextElement) cursorTextElement.textContent = randomName;
    }
  }
}

/**
 * Sizes `#cursor-container` (an `inset: 0` absolute overlay that hosts every
 * animated cursor clone) to the full scrollable document.
 *
 * TWO deviations from a naive port, both necessary:
 *
 * 1. The capture-time inline `width` / `height` are CLEARED ONCE at init.
 *    Codegen legitimately preserves authored inline sizing (the Rive canvas
 *    needs its own), but these particular values were written by this very
 *    script during a 1440px-wide capture. Left in place, an inline
 *    `width: 1440px` beats the stylesheet's `width: 100vw`, so on a narrower
 *    viewport this overlay itself extends the document's scrollWidth — and the
 *    measurement below then reads its own inflated number back and latches it.
 *    Clearing restores the live site's pre-JS state so the first measurement
 *    is honest.
 *
 * 2. Writes are memoized. The observers below fire on any layout or attribute
 *    change, and this callback mutates the very element they watch; writing
 *    unconditionally makes a ResizeObserver feed itself forever, which hangs
 *    the page (and the Playwright harness) with no error.
 */
export function initCoframeCursorContainer(root: ParentNode = document): Teardown | void {
  const container =
    root.querySelector<HTMLElement>('#cursor-container') ??
    document.getElementById('cursor-container');
  if (!container) return;

  container.style.width = '';
  container.style.height = '';

  let lastWidth = -1;
  let lastHeight = -1;

  const syncContainerSize = () => {
    const w = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
    const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    if (w === lastWidth && h === lastHeight) return;
    lastWidth = w;
    lastHeight = h;
    container.style.width = `${w}px`;
    container.style.height = `${h}px`;
  };

  syncContainerSize();

  const onLoad = () => syncContainerSize();
  window.addEventListener('load', onLoad, { once: true });
  window.addEventListener('resize', syncContainerSize);

  const ro = new ResizeObserver(syncContainerSize);
  ro.observe(document.body);
  ro.observe(document.documentElement);

  const mo = new MutationObserver(() => {
    void Promise.resolve().then(syncContainerSize);
  });
  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  return () => {
    window.removeEventListener('load', onLoad);
    window.removeEventListener('resize', syncContainerSize);
    ro.disconnect();
    mo.disconnect();
  };
}
