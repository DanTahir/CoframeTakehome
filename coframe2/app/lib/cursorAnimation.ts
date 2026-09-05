// The multiplayer-cursor / retype animation engine.
//
// Faithful TypeScript port of the page's largest inline script. Behaviour, timings
// and easing all match the original; the only structural changes are:
//   * the original's implicit global `currentVersion` is a declared module variable
//   * WebKitCSSMatrix falls back to DOMMatrix (the former is WebKit-only)
//   * the DOMContentLoaded / load / scroll listeners are wrapped in init functions
//     so React can start and stop the engine
//   * the duplicated `typeText` definition in the source exists once here
//
// How it works: each .cursor-animation holds a .cursor-animation__settings node
// carrying data-animation-* config plus one content element. On intersection the
// content is cloned, flown in from an offset, then the clone is swapped for the
// original, a cursor is cloned and animated away, a metric bubble pops, and the
// [data-retype-text] heading cycles through its data-retype-version-N strings.
// Scrolling the hero out of view "nukes" the hero instance and freezes it on its
// final text.

/* ========================================
   Configuration and Constants
   ======================================== */

export const RANDOM_POSITION_RANGE_X = { MIN: 50, MAX: 300 };
export const RANDOM_POSITION_RANGE_Y = { MIN: 50, MAX: 150 };
export const FADE_OUT_DURATION = 200;

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

interface TimeoutRecord {
  timeoutId: ReturnType<typeof setTimeout>;
  shouldNuke: boolean;
}

let hasNuked = false;
const timeoutMap: TimeoutRecord[] = [];
let stage = 0;
// Assigned as an implicit global in the original script.
let currentVersion = 1;

/** Resets engine module state. Exported for tests and re-mounts. */
export function resetEngineState(): void {
  hasNuked = false;
  timeoutMap.length = 0;
  stage = 0;
  currentVersion = 1;
}

export function hasNukedHeroAnimations(): boolean {
  return hasNuked;
}

/* ========================================
   Utility Functions
   ======================================== */

export function getRandomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function getCssVariableDuration(element: Element, variableName: string): number {
  const rootStyles = getComputedStyle(element);
  const duration = parseFloat(rootStyles.getPropertyValue(variableName)) * 1000;
  return duration || 600;
}

function setCustomTimeout(
  callback: () => void,
  delayMs: number,
  shouldNuke = false,
): ReturnType<typeof setTimeout> | undefined {
  if (hasNuked && shouldNuke) return undefined;
  const timeoutId = setTimeout(callback, delayMs);
  timeoutMap.push({ timeoutId, shouldNuke });
  return timeoutId;
}

function delay(ms: number, shouldNuke = false): Promise<void> | undefined {
  if (hasNuked && shouldNuke) return undefined;
  return new Promise<void>((resolve) => {
    setCustomTimeout(() => resolve(), ms, shouldNuke);
  });
}

function clearTimeouts(): void {
  timeoutMap.forEach((item, index) => {
    if (item.shouldNuke) {
      clearTimeout(item.timeoutId);
      timeoutMap.splice(index, 1);
    }
  });
}

function isHeroContainer(container: Element | null | undefined): boolean {
  return container?.closest('.hero') !== null && container?.closest('.hero') !== undefined;
}

function updateStyles(element: HTMLElement, styles: Record<string, string> = {}): void {
  Object.entries(styles).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      element.style.setProperty(
        key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
        value,
      );
    }
  });
}

/* ========================================
   Metric Logic
   ======================================== */

export function getRandomPercentage(stageIndex: number): number {
  const stages = [
    { min: 10, max: 15 },
    { min: 16, max: 20 },
    { min: 21, max: 25 },
    { min: 20, max: 30 },
  ];
  const { min, max } = stages[Math.min(stageIndex - 1, stages.length - 1)];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function updateMetric(container: Element): Promise<void> {
  const isHero = isHeroContainer(container);
  if (hasNuked && isHero) return;

  const metric = container.querySelector('.metric');
  if (!(metric instanceof HTMLElement)) return;

  const metricNumber = metric.querySelector('.metric__number');
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

export function getAllowedMovementRange(
  cursorRect: { left: number; right: number; top: number; bottom: number },
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
  } else if (axis === 'Y') {
    if (side === 'top') maxMovement = cursorRect.top;
    else if (side === 'bottom') maxMovement = viewportSize.height - cursorRect.bottom;
  }

  maxMovement = Math.max(0, maxMovement);
  maxMovement = Math.min(maxMovement, maxRange);
  const minMovement = Math.min(minRange, maxMovement);

  return { minMovement, maxMovement };
}

function randomizeCursorPosition(
  clonedCursor: HTMLElement,
  horizontalSide: Side,
  verticalSide: Side,
): void {
  const cursorRect = clonedCursor.getBoundingClientRect();
  const viewportSize = { width: window.innerWidth, height: window.innerHeight };

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

function cloneCursor(
  originalCursor: Element | null,
  horizontalSide: Side,
  verticalSide: Side,
  shouldReset: boolean,
  isHero: boolean,
): HTMLElement | undefined {
  if (hasNuked && isHero) return undefined;
  if (!(originalCursor instanceof HTMLElement)) return undefined;

  const clonedCursor = originalCursor.cloneNode(true) as HTMLElement;
  if (isHero) clonedCursor.setAttribute('data-should-reset', 'true');

  positionCursor(clonedCursor, originalCursor.getBoundingClientRect());

  if (shouldReset) resetCursor(clonedCursor);
  else randomizeCursorPosition(clonedCursor, horizontalSide, verticalSide);

  const cursorContainer = document.querySelector('.cursor-container');
  cursorContainer?.appendChild(clonedCursor);

  originalCursor.style.opacity = '0';

  return clonedCursor;
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

  return { moveX, moveY };
}

export function calculateDistance(x: number, y: number): number {
  return Math.sqrt(x ** 2 + y ** 2);
}

function setupCursorTransition(
  cursor: HTMLElement,
  _moveX: number,
  _moveY: number,
  duration: number,
): void {
  const fadeOutDelay = duration - FADE_OUT_DURATION;
  cursor.style.transition =
    `transform ${duration}ms var(--easing-cubic-bezier), ` +
    `opacity ${FADE_OUT_DURATION}ms var(--easing-cubic-bezier) ${fadeOutDelay}ms`;
}

function animateCursor(
  cursor: HTMLElement | undefined,
  horizontalSide: Side,
  verticalSide: Side,
  shouldNuke = false,
): void {
  if (hasNuked && shouldNuke) return;
  if (!cursor) return;

  const { moveX, moveY } = calculateCursorMovement(cursor, horizontalSide, verticalSide);
  const distance = calculateDistance(moveX, moveY);
  const transitionDuration = distance * 2;

  setupCursorTransition(cursor, moveX, moveY, transitionDuration);

  cursor.style.transform = `translate(${moveX}px, ${moveY}px)`;
  cursor.style.opacity = '0';
}

/* ========================================
   Element Cloning and Animation
   ======================================== */

function cloneContent(originalContent: Element, shouldNuke: boolean): HTMLElement | undefined {
  if (hasNuked && shouldNuke) return undefined;

  const clonedContent = originalContent.cloneNode(true) as HTMLElement;
  if (shouldNuke) clonedContent.setAttribute('data-should-reset', 'true');

  clonedContent.style.position = 'absolute';
  clonedContent.style.opacity = '0';
  clonedContent.style.zIndex = '9999';
  clonedContent.style.transition = 'none';

  return clonedContent;
}

function showContainer(container: Element): void {
  if (hasNuked && isHeroContainer(container)) return;
  if (container instanceof HTMLElement) container.style.opacity = '1';
}

function animateClonedContent(
  state: AnimationState,
  clonedContent: HTMLElement | undefined,
  shouldNuke = false,
): void {
  if (hasNuked && shouldNuke) return;
  if (!clonedContent) return;

  clonedContent.style.transition =
    state.horizontalStartDistance === '0px' && state.verticalStartDistance === '0px'
      ? `opacity ${state.animationDuration}ms var(--easing-cubic-bezier) ${state.animationDelay}ms`
      : `all ${state.animationDuration}ms var(--easing-cubic-bezier) ${state.animationDelay}ms`;

  if (state.horizontalSide) clonedContent.style.setProperty(state.horizontalSide, '0');
  if (state.verticalSide) clonedContent.style.setProperty(state.verticalSide, '0');
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

  if (clonedContent.parentNode === container) container.removeChild(clonedContent);
  if (originalContent instanceof HTMLElement) originalContent.style.opacity = '1';
}

function hideOriginalContent(
  originalContent: Element,
  _state: AnimationState,
  shouldNuke: boolean,
): void {
  if (hasNuked && shouldNuke) return;
  if (!(originalContent instanceof HTMLElement)) return;

  originalContent.style.transition =
    '-webkit-backdrop-filter 200ms var(--easing-cubic-bezier), ' +
    'backdrop-filter 200ms var(--easing-cubic-bezier), ' +
    'border-color 200ms var(--easing-cubic-bezier)';
  originalContent.style.backdropFilter = 'blur(0px)';
  originalContent.style.setProperty('-webkit-backdrop-filter', 'blur(0px)');
  originalContent.style.borderColor = 'transparent';

  originalContent.querySelectorAll('.tag').forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    element.style.transition = 'opacity 200ms var(--easing-cubic-bezier)';
    element.style.opacity = '0';
  });
}

/* ========================================
   Text Animation
   ======================================== */

export function toggleTextAnimation(element: Element, animationType: 'in' | 'out'): void {
  if (animationType === 'in') {
    element.classList.remove('hidden', 'animate-out');
    element.classList.add('visible', 'animate-in');
  } else if (animationType === 'out') {
    element.classList.remove('visible', 'animate-in');
    element.classList.add('hidden', 'animate-out');
  }
}

/** Wraps each word of `text` in a <span class="letter-effect ..."> inside `el`. */
export function wrapWordsInSpans(
  el: Element,
  text: string,
  spanClasses: string[],
): HTMLSpanElement[] {
  const words = text.split(' ');
  el.innerHTML = '';
  const spans: HTMLSpanElement[] = [];

  words.forEach((word, index) => {
    const span = document.createElement('span');
    span.classList.add(...spanClasses);
    span.textContent = word;
    el.appendChild(span);
    spans.push(span);

    if (index < words.length - 1) {
      el.appendChild(document.createTextNode(' '));
    }
  });

  return spans;
}

async function fadeInText(
  retypeElement: Element,
  fullText: string,
  shouldNuke: boolean,
): Promise<void> {
  const letterEffectDuration = getCssVariableDuration(
    document.documentElement,
    '--letter-effect-duration',
  );

  wrapWordsInSpans(retypeElement, fullText, ['letter-effect', 'hidden']);
  const spans = retypeElement.querySelectorAll('span');

  for (let i = 0; i < spans.length; i++) {
    toggleTextAnimation(spans[i], 'in');
    await delay(letterEffectDuration * 0.3, shouldNuke);
  }
}

async function fadeOutText(retypeElement: Element, shouldNuke: boolean): Promise<void> {
  const letterEffectDuration = getCssVariableDuration(
    document.documentElement,
    '--letter-effect-duration',
  );

  const spans = retypeElement.querySelectorAll('span');

  for (let i = 0; i < spans.length; i++) {
    toggleTextAnimation(spans[i], 'out');
    await delay(letterEffectDuration * 0.3, shouldNuke);
  }
}

/** Chunked character-by-character typing with a trailing thin caret. */
export function typeText(
  element: Element,
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
      nextText +
      `<span class="thin-cursor" ${shouldNuke ? 'data-should-reset="true"' : ''}>|</span>`;

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
  retypeElement: Element,
  fullText: string,
  shouldNuke: boolean,
  useFadeEffect = false,
  callback?: () => void,
): Promise<void> {
  if (hasNuked && shouldNuke) return;

  if (useFadeEffect) {
    await fadeInText(retypeElement, fullText, shouldNuke);
    if (callback) callback();
  } else {
    typeText(retypeElement, fullText, 0, 150, 3, shouldNuke, callback);
  }
}

export function getTranslateValues(element: Element): { x: number; y: number } {
  const style = window.getComputedStyle(element);
  const MatrixCtor =
    (window as unknown as { WebKitCSSMatrix?: typeof DOMMatrix }).WebKitCSSMatrix ??
    (typeof DOMMatrix !== 'undefined' ? DOMMatrix : undefined);

  if (!MatrixCtor) return { x: 0, y: 0 };

  try {
    const matrix = new MatrixCtor(style.transform === 'none' ? '' : style.transform);
    return { x: matrix.m41, y: matrix.m42 };
  } catch {
    return { x: 0, y: 0 };
  }
}

function handleCursorAnimation(
  originalCursor: Element | null,
  state: AnimationState,
  isHero: boolean,
): HTMLElement | undefined {
  if (!originalCursor || (hasNuked && isHero)) return undefined;
  if (!(originalCursor instanceof HTMLElement)) return undefined;

  originalCursor.style.transition = 'none';
  originalCursor.style.transform = 'translate(0, 0)';
  originalCursor.style.opacity = '0';

  const clonedCursor = cloneCursor(
    originalCursor,
    state.horizontalSide,
    state.verticalSide,
    false,
    isHero,
  );
  if (!clonedCursor) return undefined;

  const { x: currentTranslateX, y: currentTranslateY } = getTranslateValues(clonedCursor);
  const clonedMoveX = -currentTranslateX;
  const clonedMoveY = -currentTranslateY;
  const distance = Math.sqrt(clonedMoveX ** 2 + clonedMoveY ** 2);
  const transitionDuration = distance * 2;

  clonedCursor.style.transition =
    `transform ${transitionDuration}ms var(--easing-cubic-bezier), ` +
    `opacity ${FADE_OUT_DURATION}ms var(--easing-cubic-bezier) ` +
    `${transitionDuration - FADE_OUT_DURATION}ms`;
  clonedCursor.style.transform = 'translate(0, 0)';
  clonedCursor.style.opacity = '1';

  return clonedCursor;
}

/* ========================================
   Retype Loop
   ======================================== */

function setUpRetypeAnimation(
  originalContent: Element,
  container: Element,
  settings: Element,
  state: AnimationState,
): void {
  currentVersion = 1; // Reset the version for each animation
  if (settings.getAttribute('data-animation-retype') !== 'true') return;
  void retypeAnimation(originalContent, container, settings, state);
}

async function retypeAnimation(
  originalContent: Element,
  container: Element,
  settings: Element,
  state: AnimationState,
): Promise<void> {
  const isHero = isHeroContainer(container);
  if (hasNuked && isHero) return;

  const retypeElements = originalContent.querySelectorAll('[data-retype-text="true"]');
  const loopEnabled = settings.getAttribute('data-animation-retype-loop') === 'true';

  if (currentVersion >= 3) {
    if (loopEnabled) currentVersion = 0;
    else return;
  }

  const retypeElement = retypeElements[0];
  if (!retypeElement) return;

  const fullText = retypeElement.getAttribute(`data-retype-version-${currentVersion + 1}`);
  if (!fullText || fullText.trim() === '') return;

  // If spans don't exist yet, wrap the current text without fading it in.
  if (!retypeElement.querySelector('span')) {
    wrapWordsInSpans(retypeElement, retypeElement.textContent ?? '', [
      'letter-effect',
      'visible',
    ]);
  }

  const originalCursor = originalContent.querySelector('.cursor');
  const clonedCursor = handleCursorAnimation(originalCursor, state, isHero);
  if (!clonedCursor) return;

  const computedStyle = getComputedStyle(clonedCursor);
  const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000;

  await delay(transitionDuration, isHero);

  await fadeOutText(retypeElement, isHero);
  await delay(500, isHero);

  await typingAnimation(retypeElement, fullText, isHero, true);

  currentVersion++;

  await resetRetypeAnimation(originalContent, settings, state, container, clonedCursor, isHero);
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

  if (originalContent instanceof HTMLElement) {
    originalContent.style.borderColor = 'transparent';
  }
  originalContent.querySelectorAll('.tag').forEach((element) => {
    if (element instanceof HTMLElement) element.style.opacity = '0';
  });

  animateCursor(clonedCursor, state.horizontalSide, state.verticalSide, isHero);

  const computedStyle = getComputedStyle(clonedCursor);
  const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000;

  await delay(transitionDuration, isHero);

  void updateMetric(container);

  await delay(4000, isHero);

  void retypeAnimation(originalContent, container, settings, state);
}

async function showElement(
  state: AnimationState,
  settings: Element,
  originalContent: Element,
  clonedContent: HTMLElement | undefined,
  container: Element,
): Promise<void> {
  showContainer(container);
  animateClonedContent(state, clonedContent);

  const isHero = isHeroContainer(container);

  await delay(parseInt(state.animationDuration) + parseInt(state.animationDelay), isHero);
  if (hasNuked && isHero) return;

  removeClonedContent(container, clonedContent, originalContent, isHero);

  const originalCursor = originalContent.querySelector('.cursor');
  const clonedCursor = cloneCursor(
    originalCursor,
    state.horizontalSide,
    state.verticalSide,
    true,
    isHero,
  );

  await delay(200, isHero);
  if (hasNuked && isHero) return;

  hideOriginalContent(originalContent, state, isHero);

  void updateMetric(container);

  animateCursor(clonedCursor, state.horizontalSide, state.verticalSide, isHero);

  if (clonedCursor) {
    const computedStyle = getComputedStyle(clonedCursor);
    const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000;
    await delay(transitionDuration + 4000, isHero);
  }

  setUpRetypeAnimation(originalContent, container, settings, state);
}

/* ========================================
   Element Initialization and Resizing
   ======================================== */

export function ensurePixelSuffix(value: string): string {
  return value.includes('px') ? value : `${value}px`;
}

export function initializeState(settings: Element, originalContent: Element): AnimationState {
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
    clonedContent.style.setProperty(state.horizontalSide, state.horizontalStartDistance);
  }
  if (state.verticalStartDistance !== '0px' && state.verticalSide) {
    clonedContent.style.setProperty(state.verticalSide, state.verticalStartDistance);
  }
}

function resetOriginalContentStyle(originalContent: Element): void {
  if (!(originalContent instanceof HTMLElement)) return;
  originalContent.style.transition =
    'backdrop-filter 200ms var(--easing-cubic-bezier), ' +
    'border-color 200ms var(--easing-cubic-bezier)';
  originalContent.style.backdropFilter = 'blur(0px)';
  originalContent.style.borderColor = 'transparent';
}

function resetTagsAndCursors(
  originalContent: Element,
  container: Element,
  state: AnimationState,
): void {
  const isHero = isHeroContainer(container);
  if (hasNuked && isHero) return;

  originalContent.querySelectorAll('.tag').forEach((element) => {
    if (element instanceof HTMLElement) element.style.opacity = '0';
  });

  originalContent.querySelectorAll('.cursor').forEach((cursor) => {
    const clonedCursor = cloneCursor(
      cursor,
      state.horizontalSide,
      state.verticalSide,
      false,
      isHero,
    );
    animateCursor(clonedCursor, state.horizontalSide, state.verticalSide);
  });

  void updateMetric(container);
}

async function resetElementOnResize(
  clonedContent: HTMLElement | undefined,
  state: AnimationState,
  originalContent: Element,
  container: Element,
): Promise<void> {
  const isHero = isHeroContainer(container);
  if (hasNuked && isHero) return;

  if (clonedContent) {
    clonedContent.style.transition = 'none';
    clonedContent.style.setProperty(state.horizontalSide || 'left', '0');
    clonedContent.style.setProperty(state.verticalSide || 'top', '0');
    clonedContent.style.opacity = '1';

    if (clonedContent.parentNode === container) container.removeChild(clonedContent);
  }

  if (originalContent instanceof HTMLElement) originalContent.style.opacity = '1';

  await delay(300, isHero);
  if (hasNuked && isHero) return;

  resetOriginalContentStyle(originalContent);
  resetTagsAndCursors(originalContent, container, state);
}

/* ========================================
   Reset Hero Animations
   ======================================== */

export function resetHeroAnimations(): void {
  if (hasNuked) return;

  hasNuked = true;
  clearTimeouts();

  const cursorAnimations = document.querySelectorAll('.hero .cursor-animation');

  cursorAnimations.forEach((container) => {
    const contentElements = Array.from(container.children).filter(
      (child) => !child.classList.contains('cursor-animation__settings'),
    );
    if (contentElements.length === 0) return;

    const originalContent = contentElements[0];
    const retypeElements = originalContent.querySelectorAll('[data-retype-text="true"]');
    const metricElement = container.querySelector('.metric');
    const clonedContents = document.querySelectorAll('[data-should-reset="true"]');

    retypeElements.forEach((retypeElement) => {
      const finalTextVersion =
        retypeElement.getAttribute('data-retype-version-3') ||
        retypeElement.getAttribute('data-retype-version-2') ||
        retypeElement.getAttribute('data-retype-version-1');
      if (retypeElement instanceof HTMLElement) {
        retypeElement.innerText = finalTextVersion || retypeElement.innerText;
      }
    });

    if (originalContent instanceof HTMLElement) {
      originalContent.style.transition = 'none';
      originalContent.style.opacity = '1';
      originalContent.style.backdropFilter = 'blur(0px)';
      originalContent.style.setProperty('-webkit-backdrop-filter', 'blur(0px)');
      originalContent.style.borderColor = 'transparent';
    }

    if (metricElement instanceof HTMLElement) {
      metricElement.style.transition = 'none';
      metricElement.style.opacity = '0';
    }

    container.querySelectorAll('.tag').forEach((tag) => {
      if (!(tag instanceof HTMLElement)) return;
      tag.style.transition = 'none';
      tag.style.opacity = '0';
    });

    clonedContents.forEach((clonedContent) => clonedContent.remove());

    container.querySelectorAll('.cursor, .thin-cursor').forEach((cursor) => {
      if (!(cursor instanceof HTMLElement)) return;
      cursor.style.transition = 'none';
      cursor.style.opacity = '0';
    });

    setTimeout(() => {
      document.querySelectorAll('.hero .cursor-animation').forEach((element) => {
        if (element instanceof HTMLElement) element.style.opacity = '1';
      });
    }, 100);
  });
}

/* ========================================
   Public entry points
   ======================================== */

/** DOMContentLoaded step: hide every cursor-animation until it's ready. */
export function hideCursorAnimations(root: ParentNode = document): void {
  root.querySelectorAll('.cursor-animation').forEach((element) => {
    if (element instanceof HTMLElement) element.style.opacity = '0';
  });
}

/** window.load step: pre-wrap the hero heading, then arm every animation. */
export function startCursorAnimations(root: ParentNode = document): () => void {
  const cleanups: Array<() => void> = [];

  const textElement = root.querySelector('h1[data-retype-text="true"]');
  if (textElement && !textElement.querySelector('span')) {
    wrapWordsInSpans(textElement, textElement.textContent ?? '', [
      'letter-effect',
      'visible',
    ]);
  }

  root.querySelectorAll('.cursor-animation').forEach((container) => {
    const settings = container.querySelector('.cursor-animation__settings');
    if (!settings) return;

    const contentElements = Array.from(container.children).filter(
      (child) => !child.classList.contains('cursor-animation__settings'),
    );
    if (contentElements.length === 0) return;

    const isHero = isHeroContainer(container);
    const originalContent = contentElements[0];
    const clonedContent = cloneContent(originalContent, isHero);
    if (!clonedContent) return;

    const state = initializeState(settings, originalContent);

    setStartPosition(state, clonedContent);
    const originalRect = originalContent.getBoundingClientRect();
    clonedContent.style.width = `${originalRect.width}px`;
    clonedContent.style.height = `${originalRect.height}px`;

    if (originalContent instanceof HTMLElement) originalContent.style.opacity = '0';
    container.appendChild(clonedContent);

    let animationTimeout: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const entryIsHero = isHeroContainer(container);
          animationTimeout = setCustomTimeout(
            () => {
              if (hasNuked && entryIsHero) return;
              void showElement(state, settings, originalContent, clonedContent, container);
            },
            50,
            entryIsHero,
          );
        });
      },
      { threshold: window.innerWidth >= 992 ? 0.8 : 0.5, rootMargin: '0px' },
    );

    observer.observe(container);

    const handleResize = () => {
      if (animationTimeout) clearTimeout(animationTimeout);
      void resetElementOnResize(clonedContent, state, originalContent, container);
    };

    window.addEventListener('resize', handleResize);

    // The original stops listening once the intro animation window has passed.
    setCustomTimeout(
      () => window.removeEventListener('resize', handleResize),
      parseInt(state.animationDuration) + parseInt(state.animationDelay),
    );

    cleanups.push(() => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      if (animationTimeout) clearTimeout(animationTimeout);
    });
  });

  return () => cleanups.forEach((fn) => fn());
}

/** Freezes the hero animation once the hero has scrolled fully out of view. */
export function initHeroAnimationReset(root: ParentNode = document): () => void {
  const onScroll = () => {
    const heroElement = root.querySelector('.hero');
    if (!heroElement) return;
    const heroRect = heroElement.getBoundingClientRect();
    if (heroRect.bottom < 0) resetHeroAnimations();
  };

  window.addEventListener('scroll', onScroll);
  return () => window.removeEventListener('scroll', onScroll);
}
