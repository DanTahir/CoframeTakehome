/**
 * The cursor / retype animation engine -- the centrepiece of the hero and of
 * every `.cursor-animation` block further down the page.
 *
 * What it does, per block:
 *   1. On load, hides the real content and drops an absolutely-positioned clone
 *      offscreen (the clone is what flies in).
 *   2. When the block scrolls into view, the clone animates to its resting
 *      position, is swapped back for the real content, and a cursor clone is
 *      flung off toward a configured side while a "+N%" metric pops up.
 *   3. If the block opts in via `data-animation-retype`, the headline then
 *      cycles through `data-retype-version-1..3`, fading words out and in with
 *      a cursor round-trip between each version.
 *
 * Everything is driven by data attributes on the block's
 * `.cursor-animation__settings` child, so the timings/directions here are read
 * from the markup rather than hardcoded.
 *
 * FAITHFULLY PRESERVED QUIRKS (these look like bugs; they are the live site's
 * actual behaviour and changing them changes what the page looks like):
 *
 *  - `stage` is module-scoped and only ever increments, so the metric
 *    percentages escalate across the WHOLE page (10-15%, then 16-20%, ...) and
 *    saturate at the 20-30% band, rather than restarting per block.
 *  - `clearTimeouts()` splices the array while iterating it, so it silently
 *    skips entries. Reproduced as-is.
 *  - Once the hero scrolls fully out of view, `resetHeroAnimations()` "nukes"
 *    the hero for the rest of the session: it jumps the headline to its final
 *    version and permanently stops hero animation. It never un-nukes.
 *  - The original reads translate values with the WebKit-only
 *    `WebKitCSSMatrix`; the standard `DOMMatrix` is used here instead, which is
 *    the same maths with broader support.
 */
import { $all, type Teardown } from './runtime';

/* ========================================
   Configuration and Constants
   ======================================== */

const RANDOM_POSITION_RANGE_X = { MIN: 50, MAX: 300 };
const RANDOM_POSITION_RANGE_Y = { MIN: 50, MAX: 150 };
const FADE_OUT_DURATION = 200;

type Side = string | null;

interface AnimationState {
  horizontalSide: Side;
  horizontalStartDistance: string;
  verticalSide: Side;
  verticalStartDistance: string;
  animationDelay: string;
  animationDuration: string;
  originalBorderColor: string;
}

interface TrackedTimeout {
  timeoutId: number;
  shouldNuke: boolean;
}

/** Module-level state, mirroring the original script's globals. */
let hasNuked = false;
let timeoutMap: TrackedTimeout[] = [];
let stage = 0;
let currentVersion = 1;

/* ========================================
   Utility Functions
   ======================================== */

function getRandomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getCssVariableDuration(element: Element, variableName: string): number {
  const rootStyles = getComputedStyle(element);
  const duration = Number.parseFloat(rootStyles.getPropertyValue(variableName)) * 1000;
  return duration || 600;
}

function setCustomTimeout(
  callback: () => void,
  delayMs: number,
  shouldNuke = false,
): number | undefined {
  if (hasNuked && shouldNuke) return;
  const timeoutId = window.setTimeout(callback, delayMs);
  timeoutMap.push({ timeoutId, shouldNuke });
  return timeoutId;
}

function delay(ms: number, shouldNuke?: boolean): Promise<void> | undefined {
  if (hasNuked && shouldNuke) return;
  return new Promise<void>((resolve) => {
    setCustomTimeout(() => resolve(), ms, shouldNuke);
  });
}

function clearTimeouts(): void {
  // QUIRK: splicing during forEach skips entries. Preserved from the original.
  timeoutMap.forEach((item, index) => {
    if (item.shouldNuke) {
      window.clearTimeout(item.timeoutId);
      timeoutMap.splice(index, 1);
    }
  });
}

/** Applies a bag of styles, skipping null/undefined, like the original's helper. */
function updateStyles(element: HTMLElement, styles: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(styles)) {
    if (value === undefined || value === null) continue;
    setStyleProp(element, key, value);
  }
}

/** Assigns a style property given a camelCase or kebab-case name. */
function setStyleProp(element: HTMLElement, prop: string, value: string): void {
  const kebab = prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  element.style.setProperty(kebab, value);
}

/* ========================================
   Metric Logic
   ======================================== */

function getRandomPercentage(currentStage: number): number {
  const stages = [
    { min: 10, max: 15 },
    { min: 16, max: 20 },
    { min: 21, max: 25 },
    { min: 20, max: 30 },
  ];
  const { min, max } = stages[Math.min(currentStage - 1, stages.length - 1)];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function updateMetric(container: HTMLElement): Promise<void> {
  const isHero = container?.closest('.hero') !== null;
  if (hasNuked && isHero) return;

  const metric = container.querySelector<HTMLElement>('.metric');
  if (!metric) return;

  const metricNumber = metric.querySelector<HTMLElement>('.metric__number');
  const randomPercentage = getRandomPercentage(++stage);
  if (metricNumber) metricNumber.textContent = `${randomPercentage}%`;

  updateStyles(metric, { opacity: '0', top: '0', transition: 'none' });

  await delay(1, isHero);
  if (hasNuked && isHero) return;

  updateStyles(metric, {
    opacity: '1',
    top: '-42px',
    transition:
      'opacity 400ms var(--easing-cubic-bezier), top 400ms var(--easing-cubic-bezier)',
  });

  await delay(2000, isHero);
  if (hasNuked && isHero) return;

  updateStyles(metric, { opacity: '0', top: '0' });
}

/* ========================================
   Cursor Cloning and Movement
   ======================================== */

function cloneCursor(
  originalCursor: HTMLElement | null,
  horizontalSide: Side,
  verticalSide: Side,
  shouldReset: boolean,
  isHero: boolean,
): HTMLElement | undefined {
  if (hasNuked && isHero) return;
  if (!originalCursor) return;

  const clonedCursor = originalCursor.cloneNode(true) as HTMLElement;
  if (isHero) clonedCursor.setAttribute('data-should-reset', 'true');

  positionCursor(clonedCursor, originalCursor.getBoundingClientRect());

  if (shouldReset) resetCursor(clonedCursor);
  else randomizeCursorPosition(clonedCursor, horizontalSide, verticalSide);

  const cursorContainer = document.querySelector<HTMLElement>('.cursor-container');
  if (!cursorContainer) return;
  cursorContainer.appendChild(clonedCursor);

  originalCursor.style.opacity = '0';
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
  side: Side,
  axis: 'X' | 'Y',
  minRange: number,
  maxRange: number,
): { minMovement: number; maxMovement: number } {
  let maxMovement = 0;

  if (axis === 'X') {
    if (side === 'left') maxMovement = cursorRect.left;
    else if (side === 'right') maxMovement = viewportSize.width - cursorRect.right;
  } else {
    if (side === 'top') maxMovement = cursorRect.top;
    else if (side === 'bottom') maxMovement = viewportSize.height - cursorRect.bottom;
  }

  maxMovement = Math.max(0, maxMovement);
  maxMovement = Math.min(maxMovement, maxRange);
  const minMovement = Math.min(minRange, maxMovement);

  return { minMovement, maxMovement };
}

function calculateCursorMovement(
  cursor: HTMLElement,
  horizontalSide: Side,
  verticalSide: Side,
): { moveX: number; moveY: number } {
  const cursorRect = cursor.getBoundingClientRect();
  const viewportSize = { width: window.innerWidth, height: window.innerHeight };

  let moveX = 0;
  let moveY = 0;

  if (horizontalSide) {
    const { minMovement, maxMovement } = getAllowedMovementRange(
      cursorRect, viewportSize, horizontalSide, 'X',
      RANDOM_POSITION_RANGE_X.MIN, RANDOM_POSITION_RANGE_X.MAX,
    );
    if (maxMovement > 0) {
      const randomX = getRandomInRange(minMovement, maxMovement);
      moveX = horizontalSide === 'left' ? -randomX : randomX;
    }
  }

  if (verticalSide) {
    const { minMovement, maxMovement } = getAllowedMovementRange(
      cursorRect, viewportSize, verticalSide, 'Y',
      RANDOM_POSITION_RANGE_Y.MIN, RANDOM_POSITION_RANGE_Y.MAX,
    );
    if (maxMovement > 0) {
      const randomY = getRandomInRange(minMovement, maxMovement);
      moveY = verticalSide === 'top' ? -randomY : randomY;
    }
  }

  return { moveX, moveY };
}

function randomizeCursorPosition(
  clonedCursor: HTMLElement,
  horizontalSide: Side,
  verticalSide: Side,
): void {
  const { moveX, moveY } = calculateCursorMovement(clonedCursor, horizontalSide, verticalSide);
  clonedCursor.style.opacity = '0';
  clonedCursor.style.transform = `translate(${moveX}px, ${moveY}px)`;
}

function calculateDistance(x: number, y: number): number {
  return Math.sqrt(x ** 2 + y ** 2);
}

function setupCursorTransition(cursor: HTMLElement, duration: number): void {
  const fadeOutDelay = duration - FADE_OUT_DURATION;
  cursor.style.transition =
    `transform ${duration}ms var(--easing-cubic-bezier), ` +
    `opacity ${FADE_OUT_DURATION}ms var(--easing-cubic-bezier) ${fadeOutDelay}ms`;
}

function animateCursor(
  cursor: HTMLElement | undefined,
  horizontalSide: Side,
  verticalSide: Side,
  shouldNuke?: boolean,
): void {
  if (hasNuked && shouldNuke) return;
  if (!cursor) return;

  const { moveX, moveY } = calculateCursorMovement(cursor, horizontalSide, verticalSide);
  const transitionDuration = calculateDistance(moveX, moveY) * 2;

  setupCursorTransition(cursor, transitionDuration);
  cursor.style.transform = `translate(${moveX}px, ${moveY}px)`;
  cursor.style.opacity = '0';
}

/** Standard-API replacement for the original's WebKitCSSMatrix read. */
function getTranslateValues(element: HTMLElement): { x: number; y: number } {
  const style = window.getComputedStyle(element);
  const transform = style.transform;
  if (!transform || transform === 'none') return { x: 0, y: 0 };
  try {
    const matrix = new DOMMatrix(transform);
    return { x: matrix.m41, y: matrix.m42 };
  } catch {
    return { x: 0, y: 0 };
  }
}

/* ========================================
   Element Cloning and Animation
   ======================================== */

function cloneContent(originalContent: HTMLElement, shouldNuke: boolean): HTMLElement | undefined {
  if (hasNuked && shouldNuke) return;

  const clonedContent = originalContent.cloneNode(true) as HTMLElement;
  if (shouldNuke) clonedContent.setAttribute('data-should-reset', 'true');

  clonedContent.style.position = 'absolute';
  clonedContent.style.opacity = '0';
  clonedContent.style.zIndex = '9999';
  clonedContent.style.transition = 'none';

  return clonedContent;
}

function showContainer(container: HTMLElement): void {
  const isHero = container?.closest('.hero') !== null;
  if (hasNuked && isHero) return;
  container.style.opacity = '1';
}

function animateClonedContent(
  state: AnimationState,
  clonedContent: HTMLElement | undefined,
  shouldNuke?: boolean,
): void {
  if (hasNuked && shouldNuke) return;
  if (!clonedContent) return;

  clonedContent.style.transition =
    state.horizontalStartDistance === '0px' && state.verticalStartDistance === '0px'
      ? `opacity ${state.animationDuration}ms var(--easing-cubic-bezier) ${state.animationDelay}ms`
      : `all ${state.animationDuration}ms var(--easing-cubic-bezier) ${state.animationDelay}ms`;

  if (state.horizontalSide) setStyleProp(clonedContent, state.horizontalSide, '0');
  if (state.verticalSide) setStyleProp(clonedContent, state.verticalSide, '0');
  clonedContent.style.opacity = '1';
}

function removeClonedContent(
  container: HTMLElement,
  clonedContent: HTMLElement | undefined,
  originalContent: HTMLElement,
  shouldNuke: boolean,
): void {
  if (hasNuked && shouldNuke) return;
  if (!container || !clonedContent) return;
  if (clonedContent.parentNode === container) container.removeChild(clonedContent);
  originalContent.style.opacity = '1';
}

function hideOriginalContent(
  originalContent: HTMLElement,
  shouldNuke: boolean,
): void {
  if (hasNuked && shouldNuke) return;
  if (!originalContent) return;

  originalContent.style.transition =
    '-webkit-backdrop-filter 200ms var(--easing-cubic-bezier), ' +
    'backdrop-filter 200ms var(--easing-cubic-bezier), ' +
    'border-color 200ms var(--easing-cubic-bezier)';
  originalContent.style.backdropFilter = 'blur(0px)';
  originalContent.style.setProperty('-webkit-backdrop-filter', 'blur(0px)');
  originalContent.style.borderColor = 'transparent';

  for (const element of originalContent.querySelectorAll<HTMLElement>('.tag')) {
    element.style.transition = 'opacity 200ms var(--easing-cubic-bezier)';
    element.style.opacity = '0';
  }
}

/* ========================================
   Text Animation
   ======================================== */

function toggleTextAnimation(element: HTMLElement, animationType: 'in' | 'out'): void {
  if (animationType === 'in') {
    element.classList.remove('hidden', 'animate-out');
    element.classList.add('visible', 'animate-in');
  } else {
    element.classList.remove('visible', 'animate-in');
    element.classList.add('hidden', 'animate-out');
  }
}

/** Wraps each word of `text` in a `.letter-effect` span with the given state class. */
function wrapWordsInSpans(element: HTMLElement, text: string, stateClass: string): void {
  const words = text.split(' ');
  element.innerHTML = '';

  words.forEach((word, index) => {
    const span = document.createElement('span');
    span.classList.add('letter-effect', stateClass);
    span.textContent = word;
    element.appendChild(span);
    if (index < words.length - 1) element.appendChild(document.createTextNode(' '));
  });
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

  wrapWordsInSpans(retypeElement, fullText, 'hidden');

  const spans = retypeElement.querySelectorAll<HTMLElement>('span');
  for (let i = 0; i < spans.length; i++) {
    toggleTextAnimation(spans[i], 'in');
    await delay(letterEffectDuration * 0.3, shouldNuke);
  }
}

async function fadeOutText(retypeElement: HTMLElement, shouldNuke: boolean): Promise<void> {
  const letterEffectDuration = getCssVariableDuration(
    document.documentElement,
    '--letter-effect-duration',
  );

  const spans = retypeElement.querySelectorAll<HTMLElement>('span');
  for (let i = 0; i < spans.length; i++) {
    toggleTextAnimation(spans[i], 'out');
    await delay(letterEffectDuration * 0.3, shouldNuke);
  }
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
  if (!text || text.length === 0) return;

  if (index < text.length) {
    const nextIndex = Math.min(index + chunkSize, text.length);
    const nextText = text.slice(0, nextIndex);

    element.innerHTML =
      `${nextText}<span class="thin-cursor"${shouldNuke ? ' data-should-reset="true"' : ''}>|</span>`;

    setCustomTimeout(
      () => {
        if (hasNuked && shouldNuke) return;
        typeText(element, text, nextIndex, speed, chunkSize, shouldNuke, callback);
      },
      speed,
      shouldNuke,
    );
  } else if (callback) {
    element.innerHTML = text;
    callback();
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
    await fadeInText(retypeElement, fullText, shouldNuke);
    callback?.();
  } else {
    typeText(retypeElement, fullText, 0, 150, 3, shouldNuke, callback);
  }
}

/* ========================================
   Retype Cycle
   ======================================== */

function handleCursorAnimation(
  originalCursor: HTMLElement | null,
  state: AnimationState,
  isHero: boolean,
): HTMLElement | undefined {
  if (!originalCursor || (hasNuked && isHero)) return;

  originalCursor.style.transition = 'none';
  originalCursor.style.transform = 'translate(0, 0)';
  originalCursor.style.opacity = '0';

  const clonedCursor = cloneCursor(
    originalCursor, state.horizontalSide, state.verticalSide, false, isHero,
  );
  if (!clonedCursor) return;

  const { x: currentTranslateX, y: currentTranslateY } = getTranslateValues(clonedCursor);
  const clonedMoveX = -currentTranslateX;
  const clonedMoveY = -currentTranslateY;
  const transitionDuration = Math.sqrt(clonedMoveX ** 2 + clonedMoveY ** 2) * 2;

  clonedCursor.style.transition =
    `transform ${transitionDuration}ms var(--easing-cubic-bezier), ` +
    `opacity ${FADE_OUT_DURATION}ms var(--easing-cubic-bezier) ` +
    `${transitionDuration - FADE_OUT_DURATION}ms`;
  clonedCursor.style.transform = 'translate(0, 0)';
  clonedCursor.style.opacity = '1';

  return clonedCursor;
}

function setUpRetypeAnimation(
  originalContent: HTMLElement,
  container: HTMLElement,
  settings: HTMLElement,
  state: AnimationState,
): void {
  currentVersion = 1; // Reset the version for each animation
  if (settings.getAttribute('data-animation-retype') !== 'true') return;
  void retypeAnimation(originalContent, container, settings, state);
}

async function retypeAnimation(
  originalContent: HTMLElement,
  container: HTMLElement,
  settings: HTMLElement,
  state: AnimationState,
): Promise<void> {
  const isHero = container?.closest('.hero') !== null;
  if (hasNuked && isHero) return;

  const retypeElements = originalContent.querySelectorAll<HTMLElement>('[data-retype-text="true"]');
  const loopEnabled = settings.getAttribute('data-animation-retype-loop') === 'true';

  if (currentVersion >= 3) {
    if (loopEnabled) currentVersion = 0;
    else return;
  }

  const retypeElement = retypeElements[0];
  if (!retypeElement) return;

  const fullText = retypeElement.getAttribute(`data-retype-version-${currentVersion + 1}`);
  if (!fullText || fullText.trim() === '') return;

  // If spans don't exist yet, wrap the current text with no fade (avoids a
  // layout shift on the very first cycle).
  if (!retypeElement.querySelector('span')) {
    wrapWordsInSpans(retypeElement, retypeElement.textContent ?? '', 'visible');
  }

  const originalCursor = originalContent.querySelector<HTMLElement>('.cursor');
  const clonedCursor = handleCursorAnimation(originalCursor, state, isHero);
  if (!clonedCursor) return;

  const transitionDuration =
    Number.parseFloat(getComputedStyle(clonedCursor).transitionDuration) * 1000;

  await delay(transitionDuration, isHero);

  await fadeOutText(retypeElement, isHero);
  await delay(500, isHero);

  await typingAnimation(retypeElement, fullText, isHero, true);

  currentVersion++;

  void resetRetypeAnimation(originalContent, settings, state, container, clonedCursor, isHero);
}

async function resetRetypeAnimation(
  originalContent: HTMLElement,
  settings: HTMLElement,
  state: AnimationState,
  container: HTMLElement,
  clonedCursor: HTMLElement,
  isHero: boolean,
): Promise<void> {
  if (hasNuked && isHero) return;

  originalContent.style.borderColor = 'transparent';
  for (const element of originalContent.querySelectorAll<HTMLElement>('.tag')) {
    element.style.opacity = '0';
  }

  animateCursor(clonedCursor, state.horizontalSide, state.verticalSide, isHero);

  const transitionDuration =
    Number.parseFloat(getComputedStyle(clonedCursor).transitionDuration) * 1000;

  await delay(transitionDuration, isHero);

  void updateMetric(container);

  await delay(4000, isHero);

  void retypeAnimation(originalContent, container, settings, state);
}

async function showElement(
  state: AnimationState,
  settings: HTMLElement,
  originalContent: HTMLElement,
  clonedContent: HTMLElement | undefined,
  container: HTMLElement,
): Promise<void> {
  showContainer(container);
  animateClonedContent(state, clonedContent);

  const isHero = container?.closest('.hero') !== null;

  await delay(
    Number.parseInt(state.animationDuration, 10) + Number.parseInt(state.animationDelay, 10),
    isHero,
  );
  if (hasNuked && isHero) return;

  removeClonedContent(container, clonedContent, originalContent, isHero);

  const originalCursor = originalContent.querySelector<HTMLElement>('.cursor');
  const clonedCursor = cloneCursor(
    originalCursor, state.horizontalSide, state.verticalSide, true, isHero,
  );

  await delay(200, isHero);
  if (hasNuked && isHero) return;

  hideOriginalContent(originalContent, isHero);

  void updateMetric(container);

  animateCursor(clonedCursor, state.horizontalSide, state.verticalSide, isHero);

  if (!clonedCursor) return;
  const transitionDuration =
    Number.parseFloat(getComputedStyle(clonedCursor).transitionDuration) * 1000;

  await delay(transitionDuration + 4000, isHero);

  setUpRetypeAnimation(originalContent, container, settings, state);
}

/* ========================================
   Element Initialization and Resizing
   ======================================== */

function ensurePixelSuffix(value: string): string {
  return value.includes('px') ? value : `${value}px`;
}

function initializeState(settings: HTMLElement, originalContent: HTMLElement): AnimationState {
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
      settings.getAttribute('data-animation-horizontal-start-distance') || '-200',
    ),
    verticalSide: verticalSide || null,
    verticalStartDistance: ensurePixelSuffix(
      settings.getAttribute('data-animation-vertical-start-distance') || '-200',
    ),
    animationDelay: settings.getAttribute('data-animation-delay') || '0',
    animationDuration: settings.getAttribute('data-animation-duration') || '2000',
    originalBorderColor: getComputedStyle(originalContent).borderColor,
  };
}

function setStartPosition(state: AnimationState, clonedContent: HTMLElement | undefined): void {
  if (!clonedContent) return;
  if (state.horizontalStartDistance !== '0px' && state.horizontalSide) {
    setStyleProp(clonedContent, state.horizontalSide, state.horizontalStartDistance);
  }
  if (state.verticalStartDistance !== '0px' && state.verticalSide) {
    setStyleProp(clonedContent, state.verticalSide, state.verticalStartDistance);
  }
}

function resetOriginalContentStyle(originalContent: HTMLElement): void {
  originalContent.style.transition =
    'backdrop-filter 200ms var(--easing-cubic-bezier), ' +
    'border-color 200ms var(--easing-cubic-bezier)';
  originalContent.style.backdropFilter = 'blur(0px)';
  originalContent.style.borderColor = 'transparent';
}

function resetTagsAndCursors(
  originalContent: HTMLElement,
  container: HTMLElement,
  state: AnimationState,
): void {
  const isHero = container?.closest('.hero') !== null;
  if (hasNuked && isHero) return;

  for (const element of originalContent.querySelectorAll<HTMLElement>('.tag')) {
    element.style.opacity = '0';
  }

  for (const cursor of originalContent.querySelectorAll<HTMLElement>('.cursor')) {
    const clonedCursor = cloneCursor(
      cursor, state.horizontalSide, state.verticalSide, false, isHero,
    );
    animateCursor(clonedCursor, state.horizontalSide, state.verticalSide);
  }

  void updateMetric(container);
}

async function resetElementOnResize(
  clonedContent: HTMLElement | undefined,
  state: AnimationState,
  originalContent: HTMLElement,
  container: HTMLElement,
): Promise<void> {
  const isHero = container?.closest('.hero') !== null;
  if (hasNuked && isHero) return;

  if (clonedContent) {
    clonedContent.style.transition = 'none';
    setStyleProp(clonedContent, state.horizontalSide || 'left', '0');
    setStyleProp(clonedContent, state.verticalSide || 'top', '0');
    clonedContent.style.opacity = '1';
    if (clonedContent.parentNode === container) container.removeChild(clonedContent);
  }

  originalContent.style.opacity = '1';

  await delay(300, isHero);
  if (hasNuked && isHero) return;

  resetOriginalContentStyle(originalContent);
  resetTagsAndCursors(originalContent, container, state);
}

/* ========================================
   Reset Hero Animations ("nuke")
   ======================================== */

function resetHeroAnimations(): void {
  if (hasNuked) return;
  hasNuked = true;

  clearTimeouts();

  for (const container of document.querySelectorAll<HTMLElement>('.hero .cursor-animation')) {
    const contentElements = Array.from(container.children).filter(
      (child) => !child.classList.contains('cursor-animation__settings'),
    ) as HTMLElement[];
    if (contentElements.length === 0) continue;

    const originalContent = contentElements[0];
    const retypeElements = originalContent.querySelectorAll<HTMLElement>('[data-retype-text="true"]');
    const metricElement = container.querySelector<HTMLElement>('.metric');
    const clonedContents = document.querySelectorAll<HTMLElement>('[data-should-reset="true"]');

    for (const retypeElement of retypeElements) {
      const finalTextVersion =
        retypeElement.getAttribute('data-retype-version-3') ||
        retypeElement.getAttribute('data-retype-version-2') ||
        retypeElement.getAttribute('data-retype-version-1');
      retypeElement.innerText = finalTextVersion || retypeElement.innerText;
    }

    originalContent.style.transition = 'none';
    originalContent.style.opacity = '1';
    originalContent.style.backdropFilter = 'blur(0px)';
    originalContent.style.setProperty('-webkit-backdrop-filter', 'blur(0px)');
    originalContent.style.borderColor = 'transparent';

    if (metricElement) {
      metricElement.style.transition = 'none';
      metricElement.style.opacity = '0';
    }

    for (const tag of container.querySelectorAll<HTMLElement>('.tag')) {
      tag.style.transition = 'none';
      tag.style.opacity = '0';
    }

    for (const clonedContent of clonedContents) clonedContent.remove();

    for (const cursor of container.querySelectorAll<HTMLElement>('.cursor, .thin-cursor')) {
      cursor.style.transition = 'none';
      cursor.style.opacity = '0';
    }

    window.setTimeout(() => {
      for (const element of document.querySelectorAll<HTMLElement>('.hero .cursor-animation')) {
        element.style.opacity = '1';
      }
    }, 100);
  }
}

/* ========================================
   Public entry point
   ======================================== */

export function initCoframeRetype(root: ParentNode = document): Teardown | void {
  const containers = $all<HTMLElement>('.cursor-animation', root);
  if (!containers.length) return;

  // Fresh session state (the module-level globals persist across a re-mount).
  hasNuked = false;
  timeoutMap = [];
  stage = 0;
  currentVersion = 1;

  const cleanups: Array<() => void> = [];
  const createdClones: HTMLElement[] = [];

  // Original hides every block on DOMContentLoaded, before measuring.
  for (const element of containers) element.style.opacity = '0';

  // The h1's words arrive already wrapped in `.letter-effect.visible` spans
  // from the captured markup, so this only runs if that ever stops being true.
  const textElement = (root ?? document).querySelector<HTMLElement>('h1[data-retype-text="true"]');
  if (textElement && !textElement.querySelector('span')) {
    wrapWordsInSpans(textElement, textElement.textContent ?? '', 'visible');
  }

  for (const container of containers) {
    const settings = container.querySelector<HTMLElement>('.cursor-animation__settings');
    if (!settings) continue;

    const contentElements = Array.from(container.children).filter(
      (child) => !child.classList.contains('cursor-animation__settings'),
    ) as HTMLElement[];
    if (contentElements.length === 0) continue;

    const isHero = container?.closest('.hero') !== null;

    const originalContent = contentElements[0];
    const clonedContent = cloneContent(originalContent, isHero);
    if (!clonedContent) continue;

    const state = initializeState(settings, originalContent);

    setStartPosition(state, clonedContent);
    const originalRect = originalContent.getBoundingClientRect();
    clonedContent.style.width = `${originalRect.width}px`;
    clonedContent.style.height = `${originalRect.height}px`;

    originalContent.style.opacity = '0';
    container.appendChild(clonedContent);
    createdClones.push(clonedContent);

    let animationTimeout: number | undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const heroScoped = container?.closest('.hero') !== null;
          animationTimeout = setCustomTimeout(
            () => {
              if (hasNuked && heroScoped) return;
              void showElement(state, settings, originalContent, clonedContent, container);
            },
            50,
            heroScoped,
          );
        }
      },
      { threshold: window.innerWidth >= 992 ? 0.8 : 0.5, rootMargin: '0px' },
    );

    observer.observe(container);
    cleanups.push(() => observer.disconnect());

    const handleResize = () => {
      window.clearTimeout(animationTimeout);
      void resetElementOnResize(clonedContent, state, originalContent, container);
    };

    window.addEventListener('resize', handleResize);
    cleanups.push(() => window.removeEventListener('resize', handleResize));

    // The original stops listening for resizes once the intro has played out.
    setCustomTimeout(() => {
      window.removeEventListener('resize', handleResize);
    }, Number.parseInt(state.animationDuration, 10) + Number.parseInt(state.animationDelay, 10));
  }

  // Once the hero is fully scrolled past, freeze it in its final state.
  const onScroll = () => {
    const heroElement = document.querySelector<HTMLElement>('.hero');
    if (!heroElement) return;
    if (heroElement.getBoundingClientRect().bottom < 0) resetHeroAnimations();
  };
  window.addEventListener('scroll', onScroll);
  cleanups.push(() => window.removeEventListener('scroll', onScroll));

  return () => {
    for (const c of cleanups) c();
    for (const { timeoutId } of timeoutMap) window.clearTimeout(timeoutId);
    timeoutMap = [];
    for (const clone of createdClones) clone.remove();
    // Cursor clones are parented to .cursor-container, not to their block.
    for (const cursorClone of document.querySelectorAll('.cursor-container [data-should-reset="true"]')) {
      cursorClone.remove();
    }
  };
}
