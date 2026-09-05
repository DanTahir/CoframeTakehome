'use client';

import { useEffect } from 'react';

/**
 * Keeps `#cursor-container` sized to the full scrollable document, exactly as
 * scrape/scripts/25-cursor-animation-script.js does. The container is the
 * absolute positioning context the collaborator cursors are placed in, so it
 * has to track document growth (fonts loading, images, responsive reflow).
 */
export function initCursorContainerSizer(root: ParentNode = document): () => void {
  const container = (root as Document).getElementById?.('cursor-container');
  if (!container) return () => {};

  const syncContainerSize = () => {
    const w = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
    const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    container.style.width = `${w}px`;
    container.style.height = `${h}px`;
  };

  syncContainerSize();
  window.addEventListener('load', syncContainerSize, { once: true });
  window.addEventListener('resize', syncContainerSize);

  let resizeObserver: ResizeObserver | undefined;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(syncContainerSize);
    resizeObserver.observe(document.body);
    resizeObserver.observe(document.documentElement);
  }

  return () => {
    window.removeEventListener('resize', syncContainerSize);
    resizeObserver?.disconnect();
  };
}

export default function CursorContainerSizer() {
  useEffect(() => initCursorContainerSizer(), []);
  return null;
}
