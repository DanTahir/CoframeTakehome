/**
 * Cursor/retype animation engine — ported from captured inline script-24.js.
 *
 * This module handles:
 * - Cursor cloning and animated movement across the viewport
 * - Text typing/retyping animation with fade effects
 * - Metric updates with random percentages
 * - Intersection-observer-triggered animations with IntersectionObserver
 * - Hero-section reset (hasNuked) when scrolled out of view
 *
 * Algorithm (high level):
 * 1. On intersection, clone the cursor animation content from its start position
 * 2. Animate it to the final position with a typed-cursor element
 * 3. On completion, hide the original, show the final state
 * 4. Optionally retype to show alternate versions (version 1/2/3)
 * 5. When hero leaves viewport, stop all animations (hasNuked)
 */

import { type Teardown, type EffectInit } from './runtime';

/* ========================================
   Configuration and Constants
   ======================================== */

const RANDOM_POSITION_RANGE_X = {
  MIN: 50,
  MAX: 300,
};
const RANDOM_POSITION_RANGE_Y = {
  MIN: 50,
  MAX: 150,
};
const FADE_OUT_DURATION = 200;

let hasNuked = false;
const timeoutMap: Array<{ timeoutId: number; shouldNuke: boolean }> = [];

/* ========================================
   Utility Functions
   ======================================== */

function getRandomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getCssVariableDuration(
  element: HTMLElement,
  variableName: string,
): number {
  const rootStyles = getComputedStyle(element);
  const duration =
    parseFloat(rootStyles.getPropertyValue(variableName)) * 1000; // Convert from seconds to milliseconds
  return duration || 600; // Default to 600ms if not found
}

function setCustomTimeout(
  callback: (...args: unknown[]) => unknown,
  delay: number,
  shouldNuke = false,
  ...args: unknown[]
): number {
  if (hasNuked && shouldNuke) return 0;
  const timeoutId = window.setTimeout(callback, delay, ...args);
  timeoutMap.push({
    timeoutId,
    shouldNuke,
  });
  return timeoutId;
}

function delay(ms: number, shouldNuke: boolean): Promise<void> {
  if (hasNuked && shouldNuke) return Promise.resolve();
  return new Promise<void>((resolve) => setCustomTimeout(resolve as unknown as (...args: unknown[]) => unknown, ms, shouldNuke));
}

function clearTimeouts(): void {
  timeoutMap.forEach((item, index) => {
    if (item.shouldNuke) {
      clearTimeout(item.timeoutId);
      timeoutMap.splice(index, 1);
    }
  });
}

/* ========================================
   Metric Logic
   ======================================== */

let stage = 0;

function getRandomPercentage(stageNum: number): number {
  const stages = [
    {
      min: 10,
      max: 15,
    },
    {
      min: 16,
      max: 20,
    },
    {
      min: 21,
      max: 25,
    },
    {
      min: 20,
      max: 30,
    },
  ];

  const stageIndex = Math.min(stageNum - 1, stages.length - 1);
  const { min, max } = stages[stageIndex];

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function updateMetric(container: Element): Promise<void> {
  const isHero = container?.closest('.hero') !== null;
  if (hasNuked && isHero) return;

  const metric = container.querySelector('.metric');
  if (!metric) return;

  const metricNumber = metric.querySelector('.metric__number');
  if (!metricNumber) return;

  const randomPercentage = getRandomPercentage(++stage);

  metricNumber.textContent = `${randomPercentage}%`;

  updateStyles(metric as HTMLElement, {
    opacity: '0',
    top: '0',
    transition: 'none',
  });

  await delay(1, isHero);
  if (hasNuked && isHero) return;

  updateStyles(metric as HTMLElement, {
    opacity: '1',
    top: '-42px',
    transition:
      'opacity 400ms var(--easing-cubic-bezier), top 400ms var(--easing-cubic-bezier)',
  });

  await delay(2000, isHero);
  if (hasNuked && isHero) return;

  updateStyles(metric as HTMLElement, {
    opacity: '0',
    top: '0',
  });
}

function updateStyles(
  element: HTMLElement,
  styles: Record<string, string | undefined>,
): void {
  Object.entries(styles).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      (element.style as unknown as Record<string, unknown>)[key] = value;
    }
  });
}

/* ========================================
   Cursor Cloning and Movement
   ======================================== */

function cloneCursor(
  originalCursor: Element,
  horizontalSide: string | null,
  verticalSide: string | null,
  shouldReset: boolean,
  isHero: boolean,
): HTMLElement | undefined {
  if (hasNuked && isHero) return;

  const clonedCursor = originalCursor.cloneNode(true) as HTMLElement;

  if (isHero) {
    clonedCursor.setAttribute('data-should-reset', 'true');
  }

  positionCursor(clonedCursor, originalCursor.getBoundingClientRect());

  if (shouldReset) {
    resetCursor(clonedCursor);
  } else {
    randomizeCursorPosition(clonedCursor, horizontalSide, verticalSide);
  }

  const cursorContainer = document.querySelector('.cursor-container');

  if (!cursorContainer) return;

  cursorContainer.appendChild(clonedCursor);

  (originalCursor as HTMLElement).style.opacity = '0'; // Hide the original cursor

  return clonedCursor;
}

function positionCursor(clonedCursor: HTMLElement, rect: DOMRect): void {
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  clonedCursor.style.position = 'absolute';
  clonedCursor.style.left = `${rect.left + scrollLeft}px`;
  clonedCursor.style.top = `${rect.top + scrollTop}px`;
}

function resetCursor(clonedCursor: HTMLElement): void {
  clonedCursor.style.opacity = '1';
  clonedCursor.style.transform = 'translate(0, 0)';
}

function getAllowedMovementRange(
  cursorRect: DOMRect,
  viewportSize: { width: number; height: number },
  side: string | null,
  axis: 'X' | 'Y',
  minRange: number,
  maxRange: number,
): { minMovement: number; maxMovement: number } {
  let maxMovement = 0;

  if (axis === 'X') {
    if (side === 'left') {
      maxMovement = cursorRect.left;
    } else if (side === 'right') {
      maxMovement = viewportSize.width - cursorRect.right;
    }
  } else if (axis === 'Y') {
    if (side === 'top') {
      maxMovement = cursorRect.top;
    } else if (side === 'bottom') {
      maxMovement = viewportSize.height - cursorRect.bottom;
    }
  }

  // Ensure maxMovement is not negative
  maxMovement = Math.max(0, maxMovement);

  // Limit the maxMovement to maxRange
  maxMovement = Math.min(maxMovement, maxRange);

  // Now set minMovement to the lesser of minRange and maxMovement
  const minMovement = Math.min(minRange, maxMovement);

  return {
    minMovement,
    maxMovement,
  };
}

function randomizeCursorPosition(
  clonedCursor: HTMLElement,
  horizontalSide: string | null,
  verticalSide: string | null,
): void {
  const cursorRect = clonedCursor.getBoundingClientRect();
  const viewportSize = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  let moveX = 0;
  let moveY = 0;

  if (horizontalSide) {
    const { minMovement, maxMovement } = getAllowedMovementRange(
      cursorRect,
      viewportSize,
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
      cursorRect,
      viewportSize,
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

  clonedCursor.style.opacity = '0';
  clonedCursor.style.transform = `translate(${moveX}px, ${moveY}px)`;
}

function animateCursor(
  cursor: HTMLElement,
  horizontalSide: string | null,
  verticalSide: string | null,
  shouldNuke: boolean,
): void {
  if (hasNuked && shouldNuke) return;

  const { moveX, moveY } = calculateCursorMovement(
    cursor,
    horizontalSide,
    verticalSide,
  );
  const distance = calculateDistance(moveX, moveY);
  const transitionDuration = distance * 2;

  setupCursorTransition(cursor, moveX, moveY, transitionDuration);

  cursor.style.transform = `translate(${moveX}px, ${moveY}px)`;
  cursor.style.opacity = '0';
}

function calculateCursorMovement(
  cursor: HTMLElement,
  horizontalSide: string | null,
  verticalSide: string | null,
): { moveX: number; moveY: number } {
  const cursorRect = cursor.getBoundingClientRect();
  const viewportSize = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  let moveX = 0;
  let moveY = 0;

  if (horizontalSide) {
    const { minMovement, maxMovement } = getAllowedMovementRange(
      cursorRect,
      viewportSize,
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
      cursorRect,
      viewportSize,
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

  return {
    moveX,
    moveY,
  };
}

function calculateDistance(x: number, y: number): number {
  return Math.sqrt(x ** 2 + y ** 2);
}

function setupCursorTransition(
  cursor: HTMLElement,
  moveX: number,
  moveY: number,
  duration: number,
): void {
  const fadeOutDelay = duration - FADE_OUT_DURATION;
  cursor.style.transition = `transform ${duration}ms var(--easing-cubic-bezier), opacity ${FADE_OUT_DURATION}ms var(--easing-cubic-bezier) ${fadeOutDelay}ms`;
}

/* ========================================
   Element Cloning and Animation
   ======================================== */

function cloneContent(
  originalContent: Element,
  shouldNuke: boolean,
): HTMLElement | undefined {
  if (hasNuked && shouldNuke) return;

  const clonedContent = originalContent.cloneNode(true) as HTMLElement;

  if (shouldNuke) {
    clonedContent.setAttribute('data-should-reset', 'true');
  }

  clonedContent.style.position = 'absolute';
  clonedContent.style.opacity = '0';
  clonedContent.style.zIndex = '9999';
  clonedContent.style.transition = 'none';

  return clonedContent;
}

async function showElement(
  state: AnimationState,
  settings: Element,
  originalContent: Element,
  clonedContent: HTMLElement | undefined,
  container: Element,
): Promise<void> {
  showContainer(container);
  if (clonedContent) {
    animateClonedContent(state, clonedContent);
  }

  const isHero = container?.closest('.hero') !== null;

  await delay(
    parseInt(state.animationDuration) + parseInt(state.animationDelay),
    isHero,
  );

  if (hasNuked && isHero) return;

  removeClonedContent(container, clonedContent, originalContent, isHero);

  const originalCursor = originalContent.querySelector('.cursor');
  if (!originalCursor) return;

  const clonedCursor = cloneCursor(
    originalCursor,
    state.horizontalSide,
    state.verticalSide,
    true,
    isHero,
  );

  await delay(200, isHero);
  if (hasNuked && isHero) return;

  hideOriginalContent(originalContent as HTMLElement, state, isHero);

  updateMetric(container);

  if (clonedCursor) {
    animateCursor(clonedCursor, state.horizontalSide, state.verticalSide, isHero);

    // Get the cursor's transition duration dynamically
    const computedStyle = getComputedStyle(clonedCursor);
    const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000;

    // Wait for the cursor to finish animating
    await delay(transitionDuration + 4000, isHero);

    setUpRetypeAnimation(originalContent, container, settings, state);
  }
}

function showContainer(container: Element): void {
  const isHero = container?.closest('.hero') !== null;
  if (hasNuked && isHero) return;

  (container as HTMLElement).style.opacity = '1';
}

function animateClonedContent(
  state: AnimationState,
  clonedContent: HTMLElement,
  shouldNuke?: boolean,
): void {
  if (hasNuked && shouldNuke) return;

  if (!clonedContent) return;

  clonedContent.style.transition =
    state.horizontalStartDistance === '0px' &&
    state.verticalStartDistance === '0px'
      ? `opacity ${state.animationDuration}ms var(--easing-cubic-bezier) ${state.animationDelay}ms`
      : `all ${state.animationDuration}ms var(--easing-cubic-bezier) ${state.animationDelay}ms`;

  (clonedContent.style as unknown as Record<string, string>)[
    state.horizontalSide || 'left'
  ] = '0';
  (clonedContent.style as unknown as Record<string, string>)[state.verticalSide || 'top'] =
    '0';
  clonedContent.style.opacity = '1';
}

function removeClonedContent(
  container: Element,
  clonedContent: HTMLElement | undefined,
  originalContent: Element,
  shouldNuke: boolean,
): void {
  if (hasNuked && shouldNuke) return;

  if (!container || !clonedContent) return;

  container.removeChild(clonedContent);
  (originalContent as HTMLElement).style.opacity = '1';
}

function hideOriginalContent(
  originalContent: HTMLElement,
  state: AnimationState,
  shouldNuke: boolean,
): void {
  if (hasNuked && shouldNuke) return;

  if (!originalContent) return;

  originalContent.style.transition =
    '-webkit-backdrop-filter 200ms var(--easing-cubic-bezier), backdrop-filter 200ms var(--easing-cubic-bezier), border-color 200ms var(--easing-cubic-bezier)';
  originalContent.style.backdropFilter = 'blur(0px)';
  (originalContent.style as unknown as Record<string, string>).webkitBackdropFilter =
    'blur(0px)';
  originalContent.style.borderColor = 'transparent';

  originalContent.querySelectorAll('.tag').forEach((element) => {
    (element as HTMLElement).style.transition =
      'opacity 200ms var(--easing-cubic-bezier)';
    (element as HTMLElement).style.opacity = '0';
  });
}

/* ========================================
   Animation Functions
   ======================================== */

function toggleTextAnimation(
  element: HTMLElement,
  animationType: 'in' | 'out',
): void {
  if (animationType === 'in') {
    element.classList.remove('hidden', 'animate-out');
    element.classList.add('visible', 'animate-in');
  } else if (animationType === 'out') {
    element.classList.remove('visible', 'animate-in');
    element.classList.add('hidden', 'animate-out');
  }
}

async function fadeInText(
  retypeElement: HTMLElement,
  fullText: string,
  shouldNuke: boolean,
): Promise<void> {
  const letterEffectDuration = getCssVariableDuration(
    document.documentElement,
    '--letter-effect-duration',
  );

  // Split the words for animation
  const words = fullText.split(' ');
  retypeElement.innerHTML = ''; // Clear the element to add spans

  words.forEach((word, index) => {
    const span = document.createElement('span');
    span.classList.add('letter-effect', 'hidden');
    span.textContent = word;

    retypeElement.appendChild(span);

    if (index < words.length - 1) {
      const space = document.createTextNode(' ');
      retypeElement.appendChild(space);
    }
  });

  const spans = retypeElement.querySelectorAll('span');

  // Animate words in one by one with the same duration delay
  for (let i = 0; i < spans.length; i++) {
    toggleTextAnimation(spans[i] as HTMLElement, 'in');
    await delay(letterEffectDuration * 0.3, shouldNuke); // Delay between each word
  }
}

async function fadeOutText(
  retypeElement: HTMLElement,
  shouldNuke: boolean,
): Promise<void> {
  const letterEffectDuration = getCssVariableDuration(
    document.documentElement,
    '--letter-effect-duration',
  );

  const spans = retypeElement.querySelectorAll('span');

  // Animate words out one by one with the same duration delay
  for (let i = 0; i < spans.length; i++) {
    toggleTextAnimation(spans[i] as HTMLElement, 'out');
    await delay(letterEffectDuration * 0.3, shouldNuke); // Delay between each word, same as fadeIn
  }
}

async function typingAnimation(
  retypeElement: HTMLElement,
  fullText: string,
  shouldNuke: boolean,
  useFadeEffect = false,
  callback?: () => void,
): Promise<void> {
  if (hasNuked && shouldNuke) return;

  if (useFadeEffect) {
    // Get the letter effect duration from CSS
    getComputedStyle(document.documentElement);

    await fadeInText(retypeElement, fullText, shouldNuke);

    // Trigger the callback after the fade-in animation completes
    if (callback) callback();
  } else {
    // Default word-by-word typing logic
    typeText(retypeElement, fullText, 0, 150, 3, shouldNuke, callback);
  }
}

function handleCursorAnimation(
  originalCursor: Element,
  state: AnimationState,
  isHero: boolean,
): HTMLElement | undefined {
  if (!originalCursor || (hasNuked && isHero)) return;

  (originalCursor as HTMLElement).style.transition = 'none';
  (originalCursor as HTMLElement).style.transform = 'translate(0, 0)';
  (originalCursor as HTMLElement).style.opacity = '0';

  const clonedCursor = cloneCursor(
    originalCursor,
    state.horizontalSide,
    state.verticalSide,
    false,
    isHero,
  );
  if (!clonedCursor) return;

  const { x: currentTranslateX, y: currentTranslateY } =
    getTranslateValues(clonedCursor);
  const clonedMoveX = -currentTranslateX;
  const clonedMoveY = -currentTranslateY;
  const distance = Math.sqrt(clonedMoveX ** 2 + clonedMoveY ** 2);
  const transitionDuration = distance * 2;

  clonedCursor.style.transition = `transform ${transitionDuration}ms var(--easing-cubic-bezier), opacity ${FADE_OUT_DURATION}ms var(--easing-cubic-bezier) ${transitionDuration - FADE_OUT_DURATION}ms`;
  clonedCursor.style.transform = 'translate(0, 0)';
  clonedCursor.style.opacity = '1';

  return clonedCursor;
}

function setUpRetypeAnimation(
  originalContent: Element,
  container: Element,
  settings: Element,
  state: AnimationState,
): void {
  currentVersion = 1; // Reset the version for each animation
  if (settings.getAttribute('data-animation-retype') !== 'true') return;
  retypeAnimation(originalContent, container, settings, state);
}

function typeText(
  element: HTMLElement,
  text: string,
  index: number,
  speed: number,
  chunkSize: number,
  shouldNuke: boolean,
  callback?: () => void,
): void {
  if (hasNuked && shouldNuke) return;

  if (text && text.length > 0) {
    if (index < text.length) {
      const nextIndex = Math.min(index + chunkSize, text.length);
      const nextText = text.slice(0, nextIndex);

      // Update the element's content with the new text and append the cursor
      element.innerHTML =
        nextText +
        `<span class="thin-cursor" ${shouldNuke ? 'data-should-reset="true"' : ''}>|</span>`;

      setCustomTimeout(() => {
        if (hasNuked && shouldNuke) return;
        typeText(element, text, nextIndex, speed, chunkSize, shouldNuke, callback);
      }, speed, shouldNuke);
    } else if (callback) {
      element.innerHTML = text; // Finalize the text without the cursor
      callback();
    }
  }
}

async function retypeAnimation(
  originalContent: Element,
  container: Element,
  settings: Element,
  state: AnimationState,
): Promise<void> {
  const isHero = container?.closest('.hero') !== null;
  if (hasNuked && isHero) return;

  const retypeElements = originalContent.querySelectorAll(
    '[data-retype-text="true"]',
  );
  const loopEnabled = settings.getAttribute('data-animation-retype-loop') === 'true'; // Check if loop is enabled

  // If the loop is enabled and all versions are displayed, reset to version 0
  if (currentVersion >= 3) {
    if (loopEnabled) {
      currentVersion = 0; // Reset the version to loop
    } else {
      return; // Exit if no looping
    }
  }

  const retypeElement = retypeElements[0] as HTMLElement | undefined;
  if (!retypeElement) return;

  const fullText = retypeElement.getAttribute(
    `data-retype-version-${currentVersion + 1}`,
  );

  if (!fullText || fullText.trim() === '') return;

  // If spans don't exist, wrap the current text in spans (without fading in)
  if (!retypeElement.querySelector('span')) {
    const words = retypeElement.textContent?.split(' ') || [];
    retypeElement.innerHTML = ''; // Clear the current text

    // Wrap each word in a span, without any fade-in
    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.classList.add('letter-effect', 'visible'); // Ensure it's visible immediately
      span.textContent = word;
      retypeElement.appendChild(span);

      if (index < words.length - 1) {
        retypeElement.appendChild(document.createTextNode(' ')); // Add space between words
      }
    });
  }

  const originalCursor = originalContent.querySelector('.cursor');
  if (!originalCursor) return;

  // Handle the cursor animation and reset for the next typing effect
  const clonedCursor = handleCursorAnimation(originalCursor, state, isHero);
  if (!clonedCursor) return;

  // Get the cursor's transition duration dynamically
  const computedStyle = getComputedStyle(clonedCursor);
  const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000;

  // Wait for the cursor to finish moving before fading out the current text
  await delay(transitionDuration, isHero);

  // Fade out the current text
  await fadeOutText(retypeElement, isHero);
  await delay(500, isHero); // Wait for out animation to complete

  // Typing animation for the new text
  await typingAnimation(retypeElement, fullText, isHero, true);

  // Update the version for the next text
  currentVersion++;

  resetRetypeAnimation(
    originalContent,
    settings,
    state,
    container,
    clonedCursor,
    isHero,
  ); // Pass `settings`
}

async function resetRetypeAnimation(
  originalContent: Element,
  settings: Element,
  state: AnimationState,
  container: Element,
  clonedCursor: HTMLElement,
  isHero: boolean,
): Promise<void> {
  if (hasNuked && isHero) return;

  // Hide content-related styles before continuing to the next text
  (originalContent as HTMLElement).style.borderColor = 'transparent';
  originalContent.querySelectorAll('.tag').forEach((element) => {
    (element as HTMLElement).style.opacity = '0';
  });

  // Move the cursor away before the next animation step
  animateCursor(clonedCursor, state.horizontalSide, state.verticalSide, isHero);

  // Get the cursor's transition duration dynamically
  const computedStyle = getComputedStyle(clonedCursor);
  const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000;

  // Wait for the cursor to finish moving
  await delay(transitionDuration, isHero);

  updateMetric(container);

  await delay(4000, isHero); // Wait before triggering the next text

  // Call the next retype animation (recursive step)
  retypeAnimation(originalContent, container, settings, state);
}

/* ========================================
   Element Initialization and Resizing
   ======================================== */

function initializeState(
  settings: Element,
  originalContent: Element,
): AnimationState {
  const isMobile = window.innerWidth <= 991;
  const horizontalSide =
    settings.getAttribute(
      isMobile ? 'data-animation-horizontal-side-mobile' : 'data-animation-horizontal-side',
    ) || '';
  const verticalSide =
    settings.getAttribute(
      isMobile ? 'data-animation-vertical-side-mobile' : 'data-animation-vertical-side',
    ) || '';

  return {
    horizontalSide: horizontalSide || null,
    horizontalStartDistance: ensurePixelSuffix(
      settings.getAttribute('data-animation-horizontal-start-distance') ||
        '-200',
    ),
    verticalSide: verticalSide || null,
    verticalStartDistance: ensurePixelSuffix(
      settings.getAttribute('data-animation-vertical-start-distance') || '-200',
    ),
    animationDelay: settings.getAttribute('data-animation-delay') || '0',
    animationDuration: settings.getAttribute('data-animation-duration') || '2000',
    originalBorderColor: getComputedStyle(originalContent as HTMLElement).borderColor,
  };
}

function ensurePixelSuffix(value: string): string {
  return value.includes('px') ? value : `${value}px`;
}

function setStartPosition(
  state: AnimationState,
  clonedContent: HTMLElement,
): void {
  if (!clonedContent) return;

  if (state.horizontalStartDistance !== '0px' && state.horizontalSide) {
    (clonedContent.style as unknown as Record<string, string>)[state.horizontalSide] =
      state.horizontalStartDistance;
  }
  if (state.verticalStartDistance !== '0px' && state.verticalSide) {
    (clonedContent.style as unknown as Record<string, string>)[state.verticalSide] =
      state.verticalStartDistance;
  }
}

async function resetElementOnResize(
  clonedContent: HTMLElement | undefined,
  state: AnimationState,
  originalContent: Element,
  container: Element,
): Promise<void> {
  const isHero = container?.closest('.hero') !== null;
  if (hasNuked && isHero) return;

  if (clonedContent) {
    clonedContent.style.transition = 'none';
    (clonedContent.style as unknown as Record<string, string>)[
      state.horizontalSide || 'left'
    ] = '0';
    (clonedContent.style as unknown as Record<string, string>)[
      state.verticalSide || 'top'
    ] = '0';
    clonedContent.style.opacity = '1';

    container.removeChild(clonedContent);
  }

  (originalContent as HTMLElement).style.opacity = '1';

  await delay(300, isHero);
  if (hasNuked && isHero) return;

  resetOriginalContentStyle(originalContent as HTMLElement);
  resetTagsAndCursors(originalContent, container, state);
}

function resetOriginalContentStyle(originalContent: HTMLElement): void {
  originalContent.style.transition =
    'backdrop-filter 200ms var(--easing-cubic-bezier), border-color 200ms var(--easing-cubic-bezier)';
  originalContent.style.backdropFilter = 'blur(0px)';
  originalContent.style.borderColor = 'transparent';
}

function resetTagsAndCursors(
  originalContent: Element,
  container: Element,
  state: AnimationState,
): void {
  const isHero = container?.closest('.hero') !== null;
  if (hasNuked && isHero) return;

  originalContent.querySelectorAll('.tag').forEach((element) => {
    (element as HTMLElement).style.opacity = '0';
  });

  originalContent.querySelectorAll('.cursor').forEach((cursor) => {
    const clonedCursor = cloneCursor(
      cursor,
      state.horizontalSide,
      state.verticalSide,
      false,
      isHero,
    );
    if (clonedCursor) {
      animateCursor(clonedCursor, state.horizontalSide, state.verticalSide, isHero);
    }
  });

  updateMetric(container);
}

function getTranslateValues(element: HTMLElement): { x: number; y: number } {
  const style = window.getComputedStyle(element);
  const matrix = new (window as unknown as { WebKitCSSMatrix: typeof WebKitCSSMatrix }).WebKitCSSMatrix(style.transform);
  return {
    x: matrix.m41,
    y: matrix.m42,
  };
}

/* ========================================
   Reset Hero Animations
   ======================================== */

function resetHeroAnimations(): void {
  if (hasNuked) return;

  hasNuked = true;

  clearTimeouts();

  const cursorAnimations = document.querySelectorAll('.hero .cursor-animation');

  cursorAnimations.forEach((container) => {
    const contentElements = Array.from(container.children).filter(
      (child) =>
        !(child as Element).classList.contains('cursor-animation__settings'),
    );
    if (contentElements.length === 0) return;

    const originalContent = contentElements[0] as Element;
    const retypeElements = originalContent.querySelectorAll('[data-retype-text="true"]');
    const metricElement = container.querySelector('.metric');
    const clonedContents = document.querySelectorAll('[data-should-reset="true"]');

    retypeElements.forEach((retypeElement) => {
      const finalTextVersion =
        (retypeElement as HTMLElement).getAttribute(
          'data-retype-version-3',
        ) ||
        (retypeElement as HTMLElement).getAttribute(
          'data-retype-version-2',
        ) ||
        (retypeElement as HTMLElement).getAttribute(
          'data-retype-version-1',
        );
      (retypeElement as HTMLElement).innerText =
        finalTextVersion || (retypeElement as HTMLElement).innerText;
    });

    (originalContent as HTMLElement).style.transition = 'none';
    (originalContent as HTMLElement).style.opacity = '1';
    (originalContent as HTMLElement).style.backdropFilter = 'blur(0px)';
    ((originalContent as HTMLElement).style as unknown as Record<string, string>).webkitBackdropFilter = 'blur(0px)';
    (originalContent as HTMLElement).style.borderColor = 'transparent';

    if (metricElement) {
      (metricElement as HTMLElement).style.transition = 'none';
      (metricElement as HTMLElement).style.opacity = '0';
    }

    container.querySelectorAll('.tag').forEach((tag) => {
      (tag as HTMLElement).style.transition = 'none';
      (tag as HTMLElement).style.opacity = '0';
    });

    clonedContents.forEach((clonedContent) => {
      (clonedContent as HTMLElement).remove();
    });

    container.querySelectorAll('.cursor, .thin-cursor').forEach((cursor) => {
      (cursor as HTMLElement).style.transition = 'none';
      (cursor as HTMLElement).style.opacity = '0';
    });

    window.setTimeout(() => {
      document.querySelectorAll('.hero .cursor-animation').forEach((element) => {
        (element as HTMLElement).style.opacity = '1';
      });
    }, 100);
  });
}

/* ========================================
   State and Typing Management
   ======================================== */

let currentVersion = 0;

interface AnimationState {
  horizontalSide: string | null;
  horizontalStartDistance: string;
  verticalSide: string | null;
  verticalStartDistance: string;
  animationDelay: string;
  animationDuration: string;
  originalBorderColor: string;
}

/* ========================================
   Main Effect Initialization
   ======================================== */

export const initCoframeCursor: EffectInit = (root: ParentNode = document): Teardown | void => {
  // No-op if target elements are absent
  const cursorAnimationElements = root.querySelectorAll('.cursor-animation');
  const cursorContainer = root.querySelector('.cursor-container');
  if (!cursorAnimationElements.length || !cursorContainer) {
    return;
  }

  // CRITICAL: Clear baked inline width/height from cursor-container exactly ONCE at init
  if (cursorContainer instanceof HTMLElement) {
    cursorContainer.style.width = '';
    cursorContainer.style.height = '';
  }

  // Collect all cleanup functions for teardown
  const teardowns: Teardown[] = [];
  const scrollListener = () => {
    const heroElement = root.querySelector('.hero') as HTMLElement | null;
    if (heroElement) {
      const heroRect = heroElement.getBoundingClientRect();

      if (heroRect.bottom < 0) {
        resetHeroAnimations();
      }
    }
  };

  // Set the opacity of each element to 0 on page load
  cursorAnimationElements.forEach((element) => {
    (element as HTMLElement).style.opacity = '0';
  });

  // Process the h1 text element on load
  const runInit = () => {
    const textElement = root.querySelector('h1[data-retype-text="true"]') as HTMLElement | null;

    if (textElement && !textElement.querySelector('span')) {
      const words = textElement.textContent?.split(' ') || [];
      textElement.innerHTML = ''; // Clear the current text

      // Wrap each word in a span, ensuring no layout shift
      words.forEach((word, index) => {
        const span = document.createElement('span');
        span.classList.add('letter-effect', 'visible'); // Ensure it's visible immediately
        span.textContent = word;
        textElement.appendChild(span);

        // Add space between words but avoid it after the last word
        if (index < words.length - 1) {
          textElement.appendChild(document.createTextNode(' ')); // Add space between words
        }
      });
    }

    // Guard with data attribute to prevent double-mounting in React strict mode
    cursorAnimationElements.forEach((container) => {
      if ((container as HTMLElement).hasAttribute('data-cursor-cloned')) {
        return; // Already initialized
      }
      (container as HTMLElement).setAttribute('data-cursor-cloned', 'true');

      const settings = container.querySelector('.cursor-animation__settings');
      if (!settings) return;

      const contentElements = Array.from(container.children).filter(
        (child) => !(child as Element).classList.contains('cursor-animation__settings'),
      );
      if (contentElements.length === 0) return;

      const isHero = container?.closest('.hero') !== null;

      const originalContent = contentElements[0] as Element;
      const clonedContent = cloneContent(originalContent, isHero);

      if (!clonedContent) return;

      const state = initializeState(settings, originalContent);

      setStartPosition(state, clonedContent);
      const originalRect = originalContent.getBoundingClientRect();
      clonedContent.style.width = `${originalRect.width}px`;
      clonedContent.style.height = `${originalRect.height}px`;

      (originalContent as HTMLElement).style.opacity = '0';
      container.appendChild(clonedContent);

      let animationTimeout: number;
      let lastObservedWidth: number | null = null;
      let lastObservedHeight: number | null = null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const isHero = container?.closest('.hero') !== null;

              animationTimeout = setCustomTimeout(() => {
                if (hasNuked && isHero) return;
                showElement(state, settings, originalContent, clonedContent, container);
              }, 50, isHero);
            }
          });
        },
        {
          threshold: window.innerWidth >= 992 ? 0.8 : 0.5,
          rootMargin: '0px',
        },
      );

      observer.observe(container);

      const handleResize = () => {
        clearTimeout(animationTimeout);
        // Memoization: only reset if size actually changed
        const currentWidth = clonedContent.getBoundingClientRect().width;
        const currentHeight = clonedContent.getBoundingClientRect().height;
        if (
          lastObservedWidth === currentWidth &&
          lastObservedHeight === currentHeight
        ) {
          return; // No change, bail out early
        }
        lastObservedWidth = currentWidth;
        lastObservedHeight = currentHeight;
        resetElementOnResize(clonedContent, state, originalContent, container);
      };

      window.addEventListener('resize', handleResize);
      teardowns.push(() => {
        window.removeEventListener('resize', handleResize);
      });

      const resizeCleanupTimeout = setCustomTimeout(() => {
        window.removeEventListener('resize', handleResize);
      }, parseInt(state.animationDuration) + parseInt(state.animationDelay));

      teardowns.push(() => {
        observer.disconnect();
        clearTimeout(resizeCleanupTimeout);
      });
    });

    window.removeEventListener('scroll', scrollListener);
    window.addEventListener('scroll', scrollListener);
    teardowns.push(() => {
      window.removeEventListener('scroll', scrollListener);
    });
  };

  // Use document.readyState check instead of DOMContentLoaded
  if (document.readyState === 'complete') {
    runInit();
  } else {
    window.addEventListener('load', runInit, { once: true });
    teardowns.push(() => {
      window.removeEventListener('load', runInit);
    });
  }

  // Return main teardown function
  return () => {
    for (const t of teardowns) {
      try {
        t();
      } catch {
        // Teardown must never throw
      }
    }
  };
};
