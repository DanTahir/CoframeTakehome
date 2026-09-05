/**
 * Keeps `#cursor-container` exactly as large as the full scrollable document.
 *
 * Cloned cursors are absolutely positioned into this container in page
 * coordinates, so if it were smaller than the document the clones would clip.
 * Faithful port of the original inline script, including the ResizeObserver and
 * MutationObserver that re-sync it as content changes.
 */

export function syncCursorContainerSize(container: HTMLElement): void {
  const width = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
  const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
}

export function initCursorContainer(): () => void {
  const container = document.getElementById('cursor-container');
  if (!container) return () => {};

  const sync = () => syncCursorContainerSize(container);
  sync();

  window.addEventListener('load', sync, { once: true });
  window.addEventListener('resize', sync);

  const resizeObserver =
    typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
  resizeObserver?.observe(document.body);
  resizeObserver?.observe(document.documentElement);

  const mutationObserver = new MutationObserver(() => {
    void Promise.resolve().then(sync);
  });
  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  return () => {
    window.removeEventListener('resize', sync);
    resizeObserver?.disconnect();
    mutationObserver.disconnect();
  };
}
