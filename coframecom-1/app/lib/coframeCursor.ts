/**
 * Two small cursor-layer behaviours from the live site:
 *
 * 1. `initCoframeCursorNames` -- picks ONE random visitor name per
 *    `.cursor-animation` block and stamps it into every non-Coframe cursor
 *    label inside that block.
 * 2. `initCoframeCursorContainer` -- keeps `#cursor-container` sized to the full
 *    scrollable document so absolutely-positioned cursors can roam the page.
 *
 * FIDELITY NOTE -- the container sizing intentionally uses the document's
 * scrollWidth. At exactly 1024px wide this reproduces a small horizontal
 * overflow that the live site also has; it is matched behaviour, not a bug to
 * "fix" here.
 */
import { $all, type Teardown } from './runtime';

const NAMES = [
  'James', 'Josh', 'Liam', 'Oliver', 'Noah', 'William', 'Ben', 'Henry', 'Alex',
  'Olivia', 'Emma', 'Sarah', 'Elizabeth', 'Laura', 'Anna', 'Rachel', 'Rebecca', 'Jessica',
];

export function initCoframeCursorNames(root: ParentNode = document): Teardown | void {
  const cursorAnimations = $all<HTMLElement>('.cursor-animation', root);
  if (!cursorAnimations.length) return;

  for (const cursorAnimation of cursorAnimations) {
    const cursors = cursorAnimation.querySelectorAll<HTMLElement>(
      '.cursor[data-is-coframe-cursor="false"]',
    );
    if (!cursors.length) continue;

    const randomName = NAMES[Math.floor(Math.random() * NAMES.length)];

    for (const cursor of cursors) {
      // #cursor__text is duplicated across cursors in the source markup, so this
      // must stay a scoped query rather than getElementById.
      const cursorTextElement = cursor.querySelector<HTMLElement>('#cursor__text');
      if (cursorTextElement) cursorTextElement.textContent = randomName;
    }
  }
}

export function initCoframeCursorContainer(root: ParentNode = document): Teardown | void {
  const scope: ParentNode = root ?? document;
  const container = scope.querySelector<HTMLElement>('#cursor-container');
  if (!container) return;

  // The capture ran at 1440px wide and the sanitizer preserved the sizes this
  // very routine had already written, so the markup arrives with a baked-in
  // `width:1440px; height:12586px`. That inline width beats the stylesheet's
  // `width:100vw`, so on a narrower viewport this absolutely-positioned,
  // inset:0 layer itself extends the document's scrollWidth -- and the sync
  // below would read that inflated number back and rewrite it, pinning a
  // 1024px viewport at 1440px forever.
  //
  // Clearing the inline values restores the live site's pre-JS state (CSS-driven
  // `100vw`), so the first measurement sees real content width, exactly as it
  // does upstream where the attribute simply doesn't exist yet.
  //
  // This MUST happen once here, not inside syncContainerSize: the sync runs from
  // a ResizeObserver on <body>, so clearing the size on every pass would change
  // the element's box every time, re-fire the observer, and spin forever.
  container.style.removeProperty('width');
  container.style.removeProperty('height');

  let lastW = -1;
  let lastH = -1;

  const syncContainerSize = () => {
    const w = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
    const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);

    // Bail before touching the DOM when nothing moved, so observer callbacks
    // can't feed themselves. (The upstream script writes unconditionally and
    // gets away with it because writing an identical value is not a resize.)
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;

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
