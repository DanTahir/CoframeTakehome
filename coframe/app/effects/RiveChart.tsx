'use client';

import { useEffect } from 'react';

/**
 * Hero "impact" chart. On the live site this is Webflow's native Rive
 * integration, configured entirely through `data-rive-*` attributes on
 * `.impact__animation` (url, state machine, artboard, fit, alignment,
 * autoplay). We read the same attributes and drive @rive-app/canvas directly,
 * pointing at the self-hosted copy of the .riv file.
 *
 * `.impact__replay-button` restarts the animation, matching the live site's
 * replay affordance.
 *
 * Note: @rive-app/canvas fetches its WASM binary from unpkg.com by default.
 * Everything in this replica is self-hosted, so we vendor rive.wasm into
 * public/assets and repoint the loader at it (see RIVE_WASM_URL below).
 */

/** Self-hosted copy of node_modules/@rive-app/canvas/rive.wasm. */
export const RIVE_WASM_URL = '/assets/rive.wasm';
export function initRiveChart(root: ParentNode = document): () => void {
  const container = root.querySelector<HTMLElement>('[data-animation-type="rive"]');
  if (!container) return () => {};

  const canvas = container.querySelector('canvas');
  const src = container.getAttribute('data-rive-url');
  if (!canvas || !src) return () => {};

  const stateMachine = container.getAttribute('data-rive-state-machine') ?? undefined;
  const artboard = container.getAttribute('data-rive-artboard') ?? undefined;
  const autoplay = container.getAttribute('data-rive-autoplay') !== 'false';
  const fitAttr = (container.getAttribute('data-rive-fit') ?? 'contain').toLowerCase();
  const alignAttr = (container.getAttribute('data-rive-alignment') ?? 'center').toLowerCase();

  let disposed = false;
  // Loosely typed so the effect degrades gracefully if the chunk fails to load.
  let instance: { cleanup?: () => void; reset?: (o: unknown) => void; play?: () => void } | null =
    null;
  let detachReplay: (() => void) | undefined;

  void (async () => {
    try {
      const rive = await import('@rive-app/canvas');
      if (disposed) return;

      // Must be set before the first Rive instance is constructed, otherwise
      // the runtime falls back to fetching the binary from the CDN.
      rive.RuntimeLoader.setWasmUrl(RIVE_WASM_URL);

      const fitMap: Record<string, unknown> = {
        cover: rive.Fit.Cover,
        contain: rive.Fit.Contain,
        fill: rive.Fit.Fill,
        fitwidth: rive.Fit.FitWidth,
        fitheight: rive.Fit.FitHeight,
        none: rive.Fit.None,
        scaledown: rive.Fit.ScaleDown,
      };
      const alignMap: Record<string, unknown> = {
        center: rive.Alignment.Center,
        topleft: rive.Alignment.TopLeft,
        topcenter: rive.Alignment.TopCenter,
        topright: rive.Alignment.TopRight,
        centerleft: rive.Alignment.CenterLeft,
        centerright: rive.Alignment.CenterRight,
        bottomleft: rive.Alignment.BottomLeft,
        bottomcenter: rive.Alignment.BottomCenter,
        bottomright: rive.Alignment.BottomRight,
      };

      const layout = new rive.Layout({
        fit: (fitMap[fitAttr] ?? rive.Fit.Contain) as never,
        alignment: (alignMap[alignAttr.replace(/[\s_-]/g, '')] ??
          rive.Alignment.Center) as never,
      });

      const riveInstance = new rive.Rive({
        src,
        canvas: canvas as HTMLCanvasElement,
        autoplay,
        layout,
        artboard,
        stateMachines: stateMachine,
        onLoad: () => {
          riveInstance.resizeDrawingSurfaceToCanvas();
        },
      });
      instance = riveInstance as unknown as typeof instance;

      const onResize = () => riveInstance.resizeDrawingSurfaceToCanvas();
      window.addEventListener('resize', onResize);

      const replayButton = root.querySelector<HTMLElement>('.impact__replay-button');
      const onReplay = () => {
        riveInstance.reset({ artboard, stateMachines: stateMachine, autoplay: true });
        riveInstance.play();
      };
      replayButton?.addEventListener('click', onReplay);

      detachReplay = () => {
        window.removeEventListener('resize', onResize);
        replayButton?.removeEventListener('click', onReplay);
      };
    } catch {
      // Rive is decorative here — a load failure must not break the page.
    }
  })();

  return () => {
    disposed = true;
    detachReplay?.();
    instance?.cleanup?.();
  };
}

export default function RiveChart() {
  useEffect(() => initRiveChart(), []);
  return null;
}
