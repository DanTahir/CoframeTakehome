'use client';

// Boots every behaviour ported from the live page's inline scripts.
//
// Ordering mirrors the original document: the DOMContentLoaded-time setup runs on
// mount, and the window.load-time cursor animation arming waits for load (or runs
// immediately if the document is already complete, which is the usual case after
// a client-side React mount).
import { useEffect } from 'react';

import {
  hideCursorAnimations,
  initHeroAnimationReset,
  resetEngineState,
  startCursorAnimations,
} from '../lib/cursorAnimation';
import { initCursorContainer } from '../lib/cursorContainer';
import { initCursorNames } from '../lib/cursorNames';
import { initFadeIn } from '../lib/fadeIn';
import { initHeroForm } from '../lib/heroForm';
import { initHeroSpotlight } from '../lib/heroSpotlight';
import { initNavDropdowns } from '../lib/navDropdowns';
import { initNavScroll } from '../lib/navScroll';
import { initNewsletterForm } from '../lib/newsletterForm';
import { initRiveAnimations } from '../lib/riveChart';
import { initSwipers } from '../lib/swipers';

/**
 * Diagnostic escape hatch: `?disableRuntime=rive,swipers` skips the named
 * behaviours on boot.
 *
 * This exists because a main-thread hang inside any one of these modules looks
 * identical from the outside (no paint, no timers, injected scripts never
 * return), which makes it impossible to attribute without bisecting. With no
 * query parameter present this is inert - `disabled` is empty and every module
 * boots exactly as before - so it changes nothing for real visitors.
 *
 * Known names: cursorNames, cursorContainer, navScroll, navDropdowns,
 * heroSpotlight, heroForm, newsletterForm, fadeIn, heroAnimationReset, swipers,
 * rive, cursorAnimations.
 */
function disabledModules(): Set<string> {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = new URLSearchParams(window.location.search).get('disableRuntime');
    if (!raw) return new Set<string>();
    return new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  } catch {
    return new Set<string>();
  }
}

export function ClientRuntime(): null {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    const disabled = disabledModules();
    const enabled = (name: string) => !disabled.has(name) && !disabled.has('all');

    // Webflow's own inline bootstrap sets these on <html>; a lot of the shared
    // stylesheet is keyed off .w-mod-js.
    const html = document.documentElement;
    html.classList.add('w-mod-js');
    if (
      'ontouchstart' in window ||
      (window as unknown as { DocumentTouch?: unknown }).DocumentTouch !== undefined
    ) {
      html.classList.add('w-mod-touch');
    }

    resetEngineState();

    // --- DOMContentLoaded-equivalent setup -------------------------------
    hideCursorAnimations();
    if (enabled('cursorNames')) initCursorNames();
    if (enabled('cursorContainer')) cleanups.push(initCursorContainer());
    if (enabled('navScroll')) cleanups.push(initNavScroll());
    if (enabled('navDropdowns')) cleanups.push(initNavDropdowns());
    if (enabled('heroSpotlight')) cleanups.push(initHeroSpotlight());
    if (enabled('heroForm')) cleanups.push(initHeroForm());
    if (enabled('newsletterForm')) cleanups.push(initNewsletterForm());
    if (enabled('fadeIn')) cleanups.push(initFadeIn());
    if (enabled('heroAnimationReset')) cleanups.push(initHeroAnimationReset());

    if (enabled('swipers')) {
      const swipers = initSwipers();
      cleanups.push(() => swipers.destroy());
    }

    // The hero chart - a Rive state machine on a <canvas>.
    if (enabled('rive')) cleanups.push(initRiveAnimations());

    // --- window.load-equivalent setup ------------------------------------
    let stopCursorAnimations: (() => void) | undefined;
    const startOnLoad = () => {
      stopCursorAnimations = startCursorAnimations();
    };

    if (enabled('cursorAnimations')) {
      if (document.readyState === 'complete') {
        startOnLoad();
      } else {
        window.addEventListener('load', startOnLoad, { once: true });
        cleanups.push(() => window.removeEventListener('load', startOnLoad));
      }
    }

    return () => {
      stopCursorAnimations?.();
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}

export default ClientRuntime;
