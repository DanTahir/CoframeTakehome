'use client';

import { useEffect } from 'react';
import {
  FADE_OUT_DURATION,
  LETTER_EFFECT_FALLBACK_MS,
  LETTER_STAGGER_RATIO,
  METRIC_RISE_PX,
  METRIC_VISIBLE_MS,
  OBSERVER_THRESHOLD_DESKTOP,
  OBSERVER_THRESHOLD_MOBILE,
  RETYPE_DWELL,
  RETYPE_GAP,
  type Side,
  Timeline,
  calculateCursorMovement,
  calculateDistance,
  cursorTransition,
  getCssVariableDuration,
  getRandomPercentage,
  isMobileViewport,
  prefersReducedMotion,
  startOffsetFor,
} from './animation';

/**
 * The signature Coframe animation: a collaborator cursor glides into a heading
 * and the headline copy is swapped for alternate marketing variations, word by
 * word, while a lift metric badge pops.
 *
 * Faithful port of scrape/scripts/26-cursor-animation-script-2.js, driving the
 * same DOM (`.cursor-animation`, `.cursor-animation__settings`,
 * `[data-retype-text]`, `.cursor`, `.tag`, `.metric`) and the same CSS classes
 * (`letter-effect`, `hidden`, `visible`, `animate-in`, `animate-out`).
 */

function readSide(settings: Element, attr: string, mobileAttr: string): Side {
  const value = isMobileViewport()
    ? settings.getAttribute(mobileAttr) || settings.getAttribute(attr)
    : settings.getAttribute(attr);
  if (value === 'top' || value === 'bottom' || value === 'left' || value === 'right') {
    return value;
  }
  return null;
}

function toggleTextAnimation(element: Element, animationType: 'in' | 'out'): void {
  if (animationType === 'in') {
    element.classList.remove('hidden', 'animate-out');
    element.classList.add('visible', 'animate-in');
  } else {
    element.classList.remove('visible', 'animate-in');
    element.classList.add('hidden', 'animate-out');
  }
}

/** Wraps each word of `text` in a `.letter-effect` span. */
function wrapWords(element: HTMLElement, text: string, initialClass: 'visible' | 'hidden'): void {
  const words = text.split(' ');
  element.innerHTML = '';
  words.forEach((word, index) => {
    const span = document.createElement('span');
    span.classList.add('letter-effect', initialClass);
    span.textContent = word;
    element.appendChild(span);
    if (index < words.length - 1) {
      element.appendChild(document.createTextNode(' '));
    }
  });
}

export function initCursorRetypeAnimation(root: ParentNode = document): () => void {
  const containers = Array.from(root.querySelectorAll<HTMLElement>('.cursor-animation'));
  if (containers.length === 0) return () => {};

  const timeline = new Timeline();
  const observers: IntersectionObserver[] = [];
  const reduceMotion = prefersReducedMotion();

  for (const container of containers) {
    const settings = container.querySelector<HTMLElement>('.cursor-animation__settings');
    if (!settings) continue;

    // The animated subtree is the settings element's sibling wrap.
    const content = settings.nextElementSibling as HTMLElement | null;
    if (!content) continue;

    const retypeElement = content.querySelector<HTMLElement>('[data-retype-text="true"]');
    const cursor = content.querySelector<HTMLElement>('.cursor');
    const metric = content.querySelector<HTMLElement>('.metric');
    const tags = Array.from(content.querySelectorAll<HTMLElement>('.tag'));

    const animationDuration = Number(settings.getAttribute('data-animation-duration')) || 0;
    const animationDelay = Number(settings.getAttribute('data-animation-delay')) || 0;
    const retypeEnabled = settings.getAttribute('data-animation-retype') === 'true';
    const loopEnabled = settings.getAttribute('data-animation-retype-loop') === 'true';

    const horizontalSide = readSide(
      settings,
      'data-animation-horizontal-side',
      'data-animation-horizontal-side-mobile',
    );
    const verticalSide = readSide(
      settings,
      'data-animation-vertical-side',
      'data-animation-vertical-side-mobile',
    );
    const horizontalStart = Number(
      settings.getAttribute('data-animation-horizontal-start-distance') ?? 0,
    );
    const verticalStart = Number(
      settings.getAttribute('data-animation-vertical-start-distance') ?? 0,
    );

    // Pre-wrap the current headline so the first fade-out has spans to animate.
    if (retypeElement && !retypeElement.querySelector('span')) {
      wrapWords(retypeElement, retypeElement.textContent ?? '', 'visible');
    }

    // Reduced motion: show the final state, run nothing.
    if (reduceMotion) {
      container.style.opacity = '1';
      content.style.transform = 'translate(0, 0)';
      content.style.opacity = '1';
      if (cursor) cursor.style.opacity = '0';
      continue;
    }

    const letterDuration = () =>
      getCssVariableDuration(document.documentElement, '--letter-effect-duration') ||
      LETTER_EFFECT_FALLBACK_MS;

    const fadeOutText = async () => {
      if (!retypeElement) return;
      const stagger = letterDuration() * LETTER_STAGGER_RATIO;
      const spans = retypeElement.querySelectorAll('span');
      for (const span of Array.from(spans)) {
        if (timeline.isCancelled) return;
        toggleTextAnimation(span, 'out');
        await timeline.sleep(stagger);
      }
    };

    const fadeInText = async (fullText: string) => {
      if (!retypeElement) return;
      const stagger = letterDuration() * LETTER_STAGGER_RATIO;
      wrapWords(retypeElement, fullText, 'hidden');
      const spans = retypeElement.querySelectorAll('span');
      for (const span of Array.from(spans)) {
        if (timeline.isCancelled) return;
        toggleTextAnimation(span, 'in');
        await timeline.sleep(stagger);
      }
    };

    let metricStage = 0;
    const updateMetric = async () => {
      if (!metric) return;
      const metricNumber = metric.querySelector<HTMLElement>('.metric__number');
      if (metricNumber) {
        metricNumber.textContent = `${getRandomPercentage(++metricStage)}%`;
      }
      metric.style.opacity = '0';
      metric.style.top = '0';
      metric.style.transition = 'none';

      await timeline.sleep(1);
      if (timeline.isCancelled) return;

      metric.style.opacity = '1';
      metric.style.top = `${METRIC_RISE_PX}px`;
      metric.style.transition =
        'opacity 400ms var(--easing-cubic-bezier), top 400ms var(--easing-cubic-bezier)';

      await timeline.sleep(METRIC_VISIBLE_MS);
      if (timeline.isCancelled) return;

      metric.style.opacity = '0';
      metric.style.top = '0';
    };

    /** Cursor flies in from a random offset on the configured side. */
    const animateCursorIn = (): number => {
      if (!cursor) return 0;
      const { moveX, moveY } = calculateCursorMovement(cursor, horizontalSide, verticalSide);
      const duration = calculateDistance(moveX, moveY) * 2;

      cursor.style.transition = 'none';
      cursor.style.transform = `translate(${moveX}px, ${moveY}px)`;
      cursor.style.opacity = '0';

      // Force a reflow so the jump to the start offset is not transitioned.
      void cursor.offsetWidth;

      cursor.style.transition =
        `transform ${duration}ms var(--easing-cubic-bezier), ` +
        `opacity ${FADE_OUT_DURATION}ms var(--easing-cubic-bezier)`;
      cursor.style.transform = 'translate(0, 0)';
      cursor.style.opacity = '1';

      return duration;
    };

    /** Cursor glides away and fades over the final 200ms. */
    const animateCursorAway = (): number => {
      if (!cursor) return 0;
      const { moveX, moveY } = calculateCursorMovement(cursor, horizontalSide, verticalSide);
      const duration = calculateDistance(moveX, moveY) * 2;

      cursor.style.transition = cursorTransition(duration);
      cursor.style.transform = `translate(${moveX}px, ${moveY}px)`;
      cursor.style.opacity = '0';

      return duration;
    };

    const hideDecorations = () => {
      content.style.transition =
        '-webkit-backdrop-filter 200ms var(--easing-cubic-bezier), ' +
        'backdrop-filter 200ms var(--easing-cubic-bezier), ' +
        'border-color 200ms var(--easing-cubic-bezier)';
      content.style.borderColor = 'transparent';
      for (const tag of tags) {
        tag.style.transition = 'opacity 200ms var(--easing-cubic-bezier)';
        tag.style.opacity = '0';
      }
    };

    // `currentVersion` starts at 1 and the script reads version `n + 1`, so the
    // visible order is v2 -> v3 -> (loop) v1 -> v2 ... Preserved deliberately.
    let currentVersion = 1;

    const retypeAnimation = async (): Promise<void> => {
      if (timeline.isCancelled || !retypeElement) return;

      if (currentVersion >= 3) {
        if (loopEnabled) currentVersion = 0;
        else return;
      }

      const fullText = retypeElement.getAttribute(`data-retype-version-${currentVersion + 1}`);
      if (!fullText || fullText.trim() === '') return;

      const inDuration = animateCursorIn();
      await timeline.sleep(inDuration);
      if (timeline.isCancelled) return;

      await fadeOutText();
      await timeline.sleep(RETYPE_GAP);
      if (timeline.isCancelled) return;

      await fadeInText(fullText);
      if (timeline.isCancelled) return;

      currentVersion++;

      hideDecorations();
      const awayDuration = animateCursorAway();
      await timeline.sleep(awayDuration);
      if (timeline.isCancelled) return;

      void updateMetric();
      await timeline.sleep(RETYPE_DWELL);
      if (timeline.isCancelled) return;

      return retypeAnimation();
    };

    // ---- entrance -------------------------------------------------------
    const startX = startOffsetFor(horizontalSide, horizontalStart);
    const startY = startOffsetFor(verticalSide, verticalStart);

    content.style.transition = 'none';
    content.style.transform = `translate(${startX}px, ${startY}px)`;
    content.style.opacity = '0';
    if (cursor) cursor.style.opacity = '0';

    const runEntrance = async () => {
      if (timeline.isCancelled) return;
      container.style.opacity = '1';

      await timeline.sleep(animationDelay);
      if (timeline.isCancelled) return;

      void content.offsetWidth; // flush the start position
      content.style.transition =
        `transform ${animationDuration}ms var(--easing-cubic-bezier), ` +
        `opacity ${animationDuration}ms var(--easing-cubic-bezier)`;
      content.style.transform = 'translate(0, 0)';
      content.style.opacity = '1';

      await timeline.sleep(animationDuration);
      if (timeline.isCancelled) return;

      // Settle: clear the inline transform so normal layout resumes.
      content.style.transition = '';
      content.style.transform = '';

      if (!retypeEnabled) return;

      await timeline.sleep(200);
      if (timeline.isCancelled) return;

      hideDecorations();
      void updateMetric();

      const awayDuration = animateCursorAway();
      await timeline.sleep(awayDuration + RETYPE_DWELL);
      if (timeline.isCancelled) return;

      void retypeAnimation();
    };

    if (typeof IntersectionObserver === 'undefined') {
      void runEntrance();
      continue;
    }

    const threshold = isMobileViewport()
      ? OBSERVER_THRESHOLD_MOBILE
      : OBSERVER_THRESHOLD_DESKTOP;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          void runEntrance();
        }
      },
      { threshold },
    );
    observer.observe(container);
    observers.push(observer);
  }

  return () => {
    timeline.cancel();
    observers.forEach((o) => o.disconnect());
  };
}

export default function CursorRetypeAnimation() {
  useEffect(() => initCursorRetypeAnimation(), []);
  return null;
}
