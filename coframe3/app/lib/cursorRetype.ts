/**
 * Cursor / retype / metric animation engine.
 *
 * This is the largest of the homepage's inline scripts and drives the "AI is
 * editing your page" effect: a ghost copy of a card flies in from off-screen,
 * a labelled collaborator cursor swoops to it, the headline is retyped word by
 * word into successive `data-retype-version-N` variants, and a `%` uplift
 * metric pops above the card. Each `.cursor-animation` block is configured
 * entirely by data attributes on its `.cursor-animation__settings` child.
 *
 * The port is faithful, including the deliberately odd bits:
 *   - the shared `stage` counter, so each metric pop escalates through the
 *     10-15 / 16-20 / 21-25 / 20-30 percent bands no matter which card fired,
 *   - `currentVersion` starting at 1 (so the first retype reads
 *     `data-retype-version-2`) and looping back to 0 only when
 *     `data-animation-retype-loop="true"`,
 *   - cursor travel time derived from distance (`distance * 2` ms) with the
 *     opacity fade back-loaded into the last 200ms,
 *   - the "nuke" path: once the hero has scrolled fully out of view, every
 *     hero timeout is cancelled, clones are removed and the headline is
 *     snapped to its final variant, so returning to the top does not show a
 *     half-finished animation.
 *
 * Deviations, both deliberate and behaviour-preserving:
 *   - `WebKitCSSMatrix` (removed from modern browsers) -> standard `DOMMatrix`.
 *   - The original declared `typeText` twice and leaked `currentVersion` as an
 *     implicit global; here there is one definition and a module-scoped
 *     variable.
 *   - Everything is reset by `initCursorRetype`'s teardown so React's
 *     development-mode double mount cannot leave two engines running.
 */

const RANDOM_POSITION_RANGE_X = { MIN: 50, MAX: 300 } as const;
const RANDOM_POSITION_RANGE_Y = { MIN: 50, MAX: 150 } as const;
const FADE_OUT_DURATION = 200;

type Side = 'left' | 'right' | 'top' | 'bottom' | null;

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
  timeoutId: ReturnType<typeof setTimeout>;
  shouldNuke: boolean;
}

/* ----------------------------------------------------------------------------
 * Module state (mirrors the original script's top-level `var`s)
 * ------------------------------------------------------------------------- */

let hasNuked = false;
let timeoutMap: TrackedTimeout[] = [];
let stage = 0;
let currentVersion = 0;

/* ----------------------------------------------------------------------------
 * Utilities
 * ------------------------------------------------------------------------- */

function getRandomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getCssVariableDuration(element: Element, variableName: string): number {
  const styles = getComputedStyle(element);
  const duration = Number.parseFloat(styles.getPropertyValue(variableName)) * 1000;
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

function clearNukeableTimeouts(): void {
  timeoutMap = timeoutMap.filter((item) => {
    if (!item.shouldNuke) return true;
    clearTimeout(item.timeoutId);
    return false;
  });
}

/** Assigns camelCase style keys, which `CSSStyleDeclaration` won't index in TS. */
function updateStyles(element: HTMLElement, styles: Record<string, string>): void {
  const style = element.style as unknown as Record<string, string>;
  for (const [key, value] of Object.entries(styles)) {
    if (value !== undefined && value !== null) style[key] = value;
  }
}

function setSideStyle(element: HTMLElement, side: Side, value: string): void {
  if (!side) return;
  (element.style as unknown as Record<string, string>)[side] = value;
}

function isInHero(container: Element | null | undefined): boolean {
  return container?.closest('.hero') !== null;
}

function getTranslateValues(element: Element): { x: number; y: number } {
  const style = window.getComputedStyle(element);
  // `WebKitCSSMatrix` in the original; `DOMMatrix` is the standard equivalent.
  const matrix = new DOMMatrix(style.transform === 'none' ? '' : style.transform);
  return { x: matrix.m41, y: matrix.m42 };
}

/* ----------------------------------------------------------------------------
 * Metric ("+18%") pop
 * ------------------------------------------------------------------------- */

export function getRandomPercentage(stageNumber: number, random: () => number = Math.random): number {
  const stages = [
    { min: 10, max: 15 },
    { min: 16, max: 20 },
    { min: 21, max: 25 },
    { min: 20, max: 30 },
  ];
  const { min, max } = stages[Math.min(stageNumber - 1, stages.length - 1)];
  return Math.floor(random() * (max - min + 1)) + min;
}

async function updateMetric(container: HTMLElement): Promise<void> {
  const isHero = isInHero(container);
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

/* ----------------------------------------------------------------------------
 * Cursor cloning and movement
 * ------------------------------------------------------------------------- */

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

function randomizeCursorPosition(
  clonedCursor: HTMLElement,
  horizontalSide: Side,
  verticalSide: Side,
): void {
  const { moveX, moveY } = calculateCursorMovement(clonedCursor, horizontalSide, verticalSide);
  clonedCursor.style.opacity = '0';
  clonedCursor.style.transform = `translate(${moveX}px, ${moveY}px)`;
}

function cloneCursor(
  originalCursor: HTMLElement | null,
  horizontalSide: Side,
  verticalSide: Side,
  shouldReset: boolean,
  isHero: boolean,
): HTMLElement | undefined {
  if ((hasNuked && isHero) || !originalCursor) return undefined;

  const clonedCursor = originalCursor.cloneNode(true) as HTMLElement;
  if (isHero) clonedCursor.setAttribute('data-should-reset', 'true');

  positionCursor(clonedCursor, originalCursor.getBoundingClientRect());

  if (shouldReset) resetCursor(clonedCursor);
  else randomizeCursorPosition(clonedCursor, horizontalSide, verticalSide);

  const cursorContainer = document.querySelector<HTMLElement>('.cursor-container');
  if (!cursorContainer) return undefined;
  cursorContainer.appendChild(clonedCursor);

  originalCursor.style.opacity = '0';
  return clonedCursor;
}

export function calculateDistance(x: number, y: number): number {
  return Math.sqrt(x ** 2 + y ** 2);
}

function setupCursorTransition(
  cursor: HTMLElement,
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
  if ((hasNuked && shouldNuke) || !cursor) return;

  const { moveX, moveY } = calculateCursorMovement(cursor, horizontalSide, verticalSide);
  const distance = calculateDistance(moveX, moveY);
  const transitionDuration = distance * 2;

  setupCursorTransition(cursor, transitionDuration);
  cursor.style.transform = `translate(${moveX}px, ${moveY}px)`;
  cursor.style.opacity = '0';
}

function handleCursorAnimation(
  originalCursor: HTMLElement | null,
  state: AnimationState,
  isHero: boolean,
): HTMLElement | undefined {
  if (!originalCursor || (hasNuked && isHero)) return undefined;

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

  const { x, y } = getTranslateValues(clonedCursor);
  const distance = calculateDistance(-x, -y);
  const transitionDuration = distance * 2;

  clonedCursor.style.transition =
    `transform ${transitionDuration}ms var(--easing-cubic-bezier), ` +
    `opacity ${FADE_OUT_DURATION}ms var(--easing-cubic-bezier) ` +
    `${transitionDuration - FADE_OUT_DURATION}ms`;
  clonedCursor.style.transform = 'translate(0, 0)';
  clonedCursor.style.opacity = '1';

  return clonedCursor;
}

/* ----------------------------------------------------------------------------
 * Card clone fly-in
 * ------------------------------------------------------------------------- */

function cloneContent(originalContent: HTMLElement, shouldNuke: boolean): HTMLElement | undefined {
  if (hasNuked && shouldNuke) return undefined;

  const clonedContent = originalContent.cloneNode(true) as HTMLElement;
  if (shouldNuke) clonedContent.setAttribute('data-should-reset', 'true');

  clonedContent.style.position = 'absolute';
  clonedContent.style.opacity = '0';
  clonedContent.style.zIndex = '9999';
  clonedContent.style.transition = 'none';

  return clonedContent;
}

function animateClonedContent(
  state: AnimationState,
  clonedContent: HTMLElement | undefined,
  shouldNuke = false,
): void {
  if ((hasNuked && shouldNuke) || !clonedContent) return;

  clonedContent.style.transition =
    state.horizontalStartDistance === '0px' && state.verticalStartDistance === '0px'
      ? `opacity ${state.animationDuration}ms var(--easing-cubic-bezier) ${state.animationDelay}ms`
      : `all ${state.animationDuration}ms var(--easing-cubic-bezier) ${state.animationDelay}ms`;

  setSideStyle(clonedContent, state.horizontalSide, '0');
  setSideStyle(clonedContent, state.verticalSide, '0');
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
  updateStyles(originalContent, {
    backdropFilter: 'blur(0px)',
    webkitBackdropFilter: 'blur(0px)',
    borderColor: 'transparent',
  });

  for (const element of Array.from(originalContent.querySelectorAll<HTMLElement>('.tag'))) {
    element.style.transition = 'opacity 200ms var(--easing-cubic-bezier)';
    element.style.opacity = '0';
  }
}

/* ----------------------------------------------------------------------------
 * Text animations
 * ------------------------------------------------------------------------- */

function toggleTextAnimation(element: HTMLElement, animationType: 'in' | 'out'): void {
  if (animationType === 'in') {
    element.classList.remove('hidden', 'animate-out');
    element.classList.add('visible', 'animate-in');
  } else {
    element.classList.remove('visible', 'animate-in');
    element.classList.add('hidden', 'animate-out');
  }
}

/** Wraps each word of `text` in a `.letter-effect` span, as the original did. */
export function wrapWordsInSpans(
  element: HTMLElement,
  text: string,
  initialClass: 'hidden' | 'visible',
): HTMLSpanElement[] {
  const words = text.split(' ');
  element.innerHTML = '';
  const spans: HTMLSpanElement[] = [];

  words.forEach((word, index) => {
    const span = document.createElement('span');
    span.classList.add('letter-effect', initialClass);
    span.textContent = word;
    element.appendChild(span);
    spans.push(span);

    if (index < words.length - 1) {
      element.appendChild(document.createTextNode(' '));
    }
  });

  return spans;
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
      nextText + `<span class="thin-cursor"${shouldNuke ? ' data-should-reset="true"' : ''}>|</span>`;

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
    if (callback) callback();
  } else {
    typeText(retypeElement, fullText, 0, 150, 3, shouldNuke, callback);
  }
}

/* ----------------------------------------------------------------------------
 * Retype loop
 * ------------------------------------------------------------------------- */

function setUpRetypeAnimation(
  originalContent: HTMLElement,
  container: HTMLElement,
  settings: HTMLElement,
  state: AnimationState,
): void {
  currentVersion = 1; // Reset the version for each animation.
  if (settings.getAttribute('data-animation-retype') !== 'true') return;
  void retypeAnimation(originalContent, container, settings, state);
}

async function retypeAnimation(
  originalContent: HTMLElement,
  container: HTMLElement,
  settings: HTMLElement,
  state: AnimationState,
): Promise<void> {
  const isHero = isInHero(container);
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

  // If spans don't exist yet, wrap the current text without fading it in.
  if (!retypeElement.querySelector('span')) {
    wrapWordsInSpans(retypeElement, retypeElement.textContent ?? '', 'visible');
  }

  const originalCursor = originalContent.querySelector<HTMLElement>('.cursor');
  const clonedCursor = handleCursorAnimation(originalCursor, state, isHero);
  if (!clonedCursor) return;

  const computedStyle = getComputedStyle(clonedCursor);
  const transitionDuration = Number.parseFloat(computedStyle.transitionDuration) * 1000;

  await delay(transitionDuration, isHero);

  await fadeOutText(retypeElement, isHero);
  await delay(500, isHero);

  await typingAnimation(retypeElement, fullText, isHero, true);

  currentVersion++;

  await resetRetypeAnimation(originalContent, settings, state, container, clonedCursor, isHero);
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
  for (const element of Array.from(originalContent.querySelectorAll<HTMLElement>('.tag'))) {
    element.style.opacity = '0';
  }

  animateCursor(clonedCursor, state.horizontalSide, state.verticalSide, isHero);

  const computedStyle = getComputedStyle(clonedCursor);
  const transitionDuration = Number.parseFloat(computedStyle.transitionDuration) * 1000;

  await delay(transitionDuration, isHero);

  void updateMetric(container);

  await delay(4000, isHero);

  void retypeAnimation(originalContent, container, settings, state);
}

/* ----------------------------------------------------------------------------
 * Card reveal sequence
 * ------------------------------------------------------------------------- */

function showContainer(container: HTMLElement): void {
  if (hasNuked && isInHero(container)) return;
  container.style.opacity = '1';
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

  const isHero = isInHero(container);

  await delay(
    Number.parseInt(state.animationDuration, 10) + Number.parseInt(state.animationDelay, 10),
    isHero,
  );
  if (hasNuked && isHero) return;

  removeClonedContent(container, clonedContent, originalContent, isHero);

  const originalCursor = originalContent.querySelector<HTMLElement>('.cursor');
  const clonedCursor = cloneCursor(
    originalCursor,
    state.horizontalSide,
    state.verticalSide,
    true,
    isHero,
  );

  await delay(200, isHero);
  if (hasNuked && isHero) return;

  hideOriginalContent(originalContent, isHero);

  void updateMetric(container);

  animateCursor(clonedCursor, state.horizontalSide, state.verticalSide, isHero);

  if (!clonedCursor) return;
  const computedStyle = getComputedStyle(clonedCursor);
  const transitionDuration = Number.parseFloat(computedStyle.transitionDuration) * 1000;

  await delay(transitionDuration + 4000, isHero);

  setUpRetypeAnimation(originalContent, container, settings, state);
}

/* ----------------------------------------------------------------------------
 * Per-block setup
 * ------------------------------------------------------------------------- */

export function ensurePixelSuffix(value: string): string {
  return value.includes('px') ? value : `${value}px`;
}

function initializeState(settings: HTMLElement, originalContent: HTMLElement): AnimationState {
  const isMobile = window.innerWidth <= 991;
  const horizontalSide = settings.getAttribute(
    isMobile ? 'data-animation-horizontal-side-mobile' : 'data-animation-horizontal-side',
  );
  const verticalSide = settings.getAttribute(
    isMobile ? 'data-animation-vertical-side-mobile' : 'data-animation-vertical-side',
  );

  return {
    horizontalSide: (horizontalSide || null) as Side,
    horizontalStartDistance: ensurePixelSuffix(
      settings.getAttribute('data-animation-horizontal-start-distance') || '-200',
    ),
    verticalSide: (verticalSide || null) as Side,
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
  if (state.horizontalStartDistance !== '0px') {
    setSideStyle(clonedContent, state.horizontalSide, state.horizontalStartDistance);
  }
  if (state.verticalStartDistance !== '0px') {
    setSideStyle(clonedContent, state.verticalSide, state.verticalStartDistance);
  }
}

function resetOriginalContentStyle(originalContent: HTMLElement): void {
  originalContent.style.transition =
    'backdrop-filter 200ms var(--easing-cubic-bezier), border-color 200ms var(--easing-cubic-bezier)';
  updateStyles(originalContent, {
    backdropFilter: 'blur(0px)',
    borderColor: 'transparent',
  });
}

function resetTagsAndCursors(
  originalContent: HTMLElement,
  container: HTMLElement,
  state: AnimationState,
): void {
  const isHero = isInHero(container);
  if (hasNuked && isHero) return;

  for (const element of Array.from(originalContent.querySelectorAll<HTMLElement>('.tag'))) {
    element.style.opacity = '0';
  }

  for (const cursor of Array.from(originalContent.querySelectorAll<HTMLElement>('.cursor'))) {
    const clonedCursor = cloneCursor(
      cursor,
      state.horizontalSide,
      state.verticalSide,
      false,
      isHero,
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
  const isHero = isInHero(container);
  if (hasNuked && isHero) return;

  if (clonedContent) {
    clonedContent.style.transition = 'none';
    setSideStyle(clonedContent, state.horizontalSide ?? 'left', '0');
    setSideStyle(clonedContent, state.verticalSide ?? 'top', '0');
    clonedContent.style.opacity = '1';
    if (clonedContent.parentNode === container) container.removeChild(clonedContent);
  }

  originalContent.style.opacity = '1';

  await delay(300, isHero);
  if (hasNuked && isHero) return;

  resetOriginalContentStyle(originalContent);
  resetTagsAndCursors(originalContent, container, state);
}

/* ----------------------------------------------------------------------------
 * Hero reset ("nuke")
 * ------------------------------------------------------------------------- */

function resetHeroAnimations(): void {
  if (hasNuked) return;
  hasNuked = true;

  clearNukeableTimeouts();

  const cursorAnimations = document.querySelectorAll<HTMLElement>('.hero .cursor-animation');

  for (const container of Array.from(cursorAnimations)) {
    const contentElements = Array.from(container.children).filter(
      (child) => !child.classList.contains('cursor-animation__settings'),
    ) as HTMLElement[];
    if (contentElements.length === 0) continue;

    const originalContent = contentElements[0];
    const retypeElements = originalContent.querySelectorAll<HTMLElement>('[data-retype-text="true"]');
    const metricElement = container.querySelector<HTMLElement>('.metric');
    const clonedContents = document.querySelectorAll<HTMLElement>('[data-should-reset="true"]');

    for (const retypeElement of Array.from(retypeElements)) {
      const finalTextVersion =
        retypeElement.getAttribute('data-retype-version-3') ||
        retypeElement.getAttribute('data-retype-version-2') ||
        retypeElement.getAttribute('data-retype-version-1');
      retypeElement.innerText = finalTextVersion || retypeElement.innerText;
    }

    originalContent.style.transition = 'none';
    updateStyles(originalContent, {
      opacity: '1',
      backdropFilter: 'blur(0px)',
      webkitBackdropFilter: 'blur(0px)',
      borderColor: 'transparent',
    });

    if (metricElement) {
      metricElement.style.transition = 'none';
      metricElement.style.opacity = '0';
    }

    for (const tag of Array.from(container.querySelectorAll<HTMLElement>('.tag'))) {
      tag.style.transition = 'none';
      tag.style.opacity = '0';
    }

    for (const clonedContent of Array.from(clonedContents)) clonedContent.remove();

    for (const cursor of Array.from(
      container.querySelectorAll<HTMLElement>('.cursor, .thin-cursor'),
    )) {
      cursor.style.transition = 'none';
      cursor.style.opacity = '0';
    }

    setTimeout(() => {
      for (const element of Array.from(
        document.querySelectorAll<HTMLElement>('.hero .cursor-animation'),
      )) {
        element.style.opacity = '1';
      }
    }, 100);
  }
}

/* ----------------------------------------------------------------------------
 * Entry point
 * ------------------------------------------------------------------------- */

export function initCursorRetype(): () => void {
  // Fresh state per init, so a React StrictMode remount cannot double-run.
  hasNuked = false;
  timeoutMap = [];
  stage = 0;
  currentVersion = 0;

  const cleanups: Array<() => void> = [];

  // DOMContentLoaded-equivalent: hide every animation block until it is ready.
  for (const element of Array.from(document.querySelectorAll<HTMLElement>('.cursor-animation'))) {
    element.style.opacity = '0';
  }

  // The hero headline is wrapped up-front so retyping cannot shift layout.
  const textElement = document.querySelector<HTMLElement>('h1[data-retype-text="true"]');
  if (textElement && !textElement.querySelector('span')) {
    wrapWordsInSpans(textElement, textElement.textContent ?? '', 'visible');
  }

  for (const container of Array.from(document.querySelectorAll<HTMLElement>('.cursor-animation'))) {
    const settings = container.querySelector<HTMLElement>('.cursor-animation__settings');
    if (!settings) continue;

    const contentElements = Array.from(container.children).filter(
      (child) => !child.classList.contains('cursor-animation__settings'),
    ) as HTMLElement[];
    if (contentElements.length === 0) continue;

    const isHero = isInHero(container);

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

    let animationTimeout: ReturnType<typeof setTimeout> | undefined;

    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            animationTimeout = setCustomTimeout(
              () => {
                if (hasNuked && isHero) return;
                void showElement(state, settings, originalContent, clonedContent, container);
              },
              50,
              isHero,
            );
          }
        },
        { threshold: window.innerWidth >= 992 ? 0.8 : 0.5, rootMargin: '0px' },
      );
      observer.observe(container);
      cleanups.push(() => observer.disconnect());
    }

    const handleResize = () => {
      clearTimeout(animationTimeout);
      void resetElementOnResize(clonedContent, state, originalContent, container);
    };

    window.addEventListener('resize', handleResize);
    cleanups.push(() => window.removeEventListener('resize', handleResize));

    // The original unbinds the resize reset once the fly-in has completed.
    setCustomTimeout(
      () => window.removeEventListener('resize', handleResize),
      Number.parseInt(state.animationDuration, 10) + Number.parseInt(state.animationDelay, 10),
    );
  }

  const onScroll = () => {
    const heroElement = document.querySelector<HTMLElement>('.hero');
    if (!heroElement) return;
    if (heroElement.getBoundingClientRect().bottom < 0) resetHeroAnimations();
  };

  window.addEventListener('scroll', onScroll);
  cleanups.push(() => window.removeEventListener('scroll', onScroll));

  return () => {
    for (const fn of cleanups) fn();
    for (const item of timeoutMap) clearTimeout(item.timeoutId);
    timeoutMap = [];
  };
}
