// Keeps #cursor-container spanning the full scrollable page, since cloned cursors
// are absolutely positioned inside it in document coordinates.
// Ported from the page's inline syncContainerSize script.
//
// The original inline script drives this from a document-wide MutationObserver
// whose callback schedules the resize as a *microtask*:
//
//     const mo = new MutationObserver(() => { Promise.resolve().then(syncContainerSize); });
//     mo.observe(document.documentElement, { childList: true, subtree: true,
//                                            attributes: true, characterData: true });
//
// That is a latent main-thread hang, and this replica trips it where the live site
// happens not to. The mechanism:
//
//   1. #cursor-container is `position:absolute` inside the scrollable body, so its
//      own height contributes to document.body.scrollHeight.
//   2. syncContainerSize sets container.style.height = scrollHeight. If the
//      container's offsetTop is > 0, the next measurement is *larger* than the last,
//      so the value written keeps growing and never settles.
//   3. Writing a genuinely-changed style value queues a new attribute mutation
//      record (Blink skips re-serializing the style attribute only when the value is
//      unchanged - which is why a converging page, like the live one, quietly stops).
//   4. The callback re-schedules via Promise.resolve(), i.e. a microtask. The
//      microtask queue is drained *exhaustively* before the event loop continues, so
//      a self-feeding chain starves the thread: no paint, no timers, no input, and
//      any injected script (e.g. Playwright's evaluate) hangs forever.
//
// Three changes make that structurally impossible while preserving the observable
// behaviour (container tracks the scrollable page size):
//
//   * The observer path coalesces through requestAnimationFrame instead of a
//     microtask. rAF runs at most once per frame and inherently yields to the event
//     loop, so a mutation storm degrades to "one sync per frame" rather than a hang.
//   * Writes are idempotent: if the computed px value already equals the element's
//     inline style, we skip the assignment, so we never queue a mutation record for
//     a no-op.
//   * Mutations caused by our own writes are ignored, breaking the self-trigger even
//     if a value does legitimately change.
//
// The direct `resize`/`load` listeners stay synchronous, matching the original.

export function initCursorContainer(root: ParentNode = document): () => void {
  const container = (root as Document | Element).querySelector?.('#cursor-container');
  if (!(container instanceof HTMLElement)) return () => {};

  // Set while we are writing, so the observer can ignore its own echo.
  let writing = false;

  const syncContainerSize = () => {
    const w = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
    const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const nextWidth = `${w}px`;
    const nextHeight = `${h}px`;

    // Compare against the element's *live* inline style rather than a cache of what
    // we last wrote. Still idempotent - an identical value means no write and so no
    // mutation record - but it also re-asserts the correct size if anything else
    // changed the inline style out from under us.
    const needsWidth = container.style.width !== nextWidth;
    const needsHeight = container.style.height !== nextHeight;
    if (!needsWidth && !needsHeight) return;

    writing = true;
    try {
      if (needsWidth) container.style.width = nextWidth;
      if (needsHeight) container.style.height = nextHeight;
    } finally {
      writing = false;
    }
  };

  syncContainerSize();
  window.addEventListener('load', syncContainerSize, { once: true });
  window.addEventListener('resize', syncContainerSize);

  const resizeObserver =
    typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncContainerSize) : null;
  resizeObserver?.observe(document.body);
  resizeObserver?.observe(document.documentElement);

  // Coalesce observer-driven syncs to one per frame.
  let scheduled = 0;
  const schedule = () => {
    if (scheduled) return;
    if (typeof requestAnimationFrame !== 'function') {
      // Environments without rAF (e.g. jsdom in some configs): fall back to a
      // macrotask, which still yields to the event loop unlike a microtask.
      scheduled = window.setTimeout(() => {
        scheduled = 0;
        syncContainerSize();
      }, 16);
      return;
    }
    scheduled = requestAnimationFrame(() => {
      scheduled = 0;
      syncContainerSize();
    });
  };

  const mutationObserver = new MutationObserver((records) => {
    // Ignore the style-attribute churn produced by our own writes.
    if (writing) return;
    const external = records.some(
      (r) =>
        r.target !== container ||
        !(r.type === 'attributes' && r.attributeName === 'style'),
    );
    if (external) schedule();
  });
  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  return () => {
    window.removeEventListener('resize', syncContainerSize);
    window.removeEventListener('load', syncContainerSize);
    resizeObserver?.disconnect();
    mutationObserver.disconnect();
    if (scheduled) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(scheduled);
      clearTimeout(scheduled);
      scheduled = 0;
    }
  };
}
