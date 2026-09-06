/**
 * Coframe cursor animation + retype engine.
 *
 * This module is a faithful TypeScript port of `scrape/analysis/script-24.js`.
 * It implements two core behaviours:
 *   1. Animates fake collaborator cursors flying into headlines with a motion trail
 *   2. Retypes headline text through up to 3 A/B copy "versions" with letter-by-letter effects
 *
 * The animation runs on intersection (viewport visibility) and resets when the hero
 * section scrolls out of view. All mutable state (timeouts, stage counters, observers,
 * DOM edits) is kept in closure and fully tearable for React strict mode.
 *
 * Key decisions:
 *   - Module state is per-invocation (closure), not global, for idempotency.
 *   - All timers/listeners/observers are tracked and cleared in teardown.
 *   - Uses DOMMatrix instead of deprecated WebKitCSSMatrix.
 *   - Respects prefersReducedMotion() by skipping animations and leaving text final/readable.
 *   - Handles load-gating: if document.readyState === 'complete', runs immediately;
 *     otherwise listens to 'load' with { once: true } and removes it in teardown.
 */

import { $all, prefersReducedMotion, type Teardown } from './runtime';

// ============================================================================
// Configuration and Constants (preserved verbatim from upstream)
// ============================================================================

const RANDOM_POSITION_RANGE_X = { MIN: 50, MAX: 300 };
const RANDOM_POSITION_RANGE_Y = { MIN: 50, MAX: 150 };
const FADE_OUT_DURATION = 200;

// ============================================================================
// Main Export
// ============================================================================

/**
 * Initializes the cursor animation on all `.cursor-animation` containers
 * within the given root (defaults to document).
 *
 * Returns a teardown function that clears all timeouts, listeners, observers,
 * reverts inline styles, and removes cloned DOM nodes. Safe to call multiple
 * times in sequence (e.g., React strict mode double-mount).
 */
export function initCoframeCursorAnimation(root: ParentNode = document): Teardown | void {
  // Early exit if reduced motion is preferred; leave all text in final, readable state
  if (prefersReducedMotion()) return;

  // =========================================================================
  // Closure Scope: All Mutable State
  // =========================================================================

  let hasNuked = false; // Set to true when hero scrolls out of view
  let stage = 0; // Metric display stage counter
  let currentVersion = 0; // Retype animation version (0, 1, 2)

  const timeoutMap: Array<{ timeoutId: ReturnType<typeof setTimeout>; shouldNuke: boolean }> = [];
  const allTimeoutIds: Set<ReturnType<typeof setTimeout>> = new Set();
  const allListeners: Array<{ target: EventTarget; event: string; handler: EventListener; options?: boolean | AddEventListenerOptions }> = [];
  const allObservers: IntersectionObserver[] = [];
  const clonedElements: Element[] = [];
  const originalOpacities: Map<Element, string> = new Map();

  // =========================================================================
  // Utility: Custom Timeout Management
  // =========================================================================

  function setCustomTimeout(
    callback: (...args: unknown[]) => void,
    delay: number,
    shouldNuke: boolean = false,
    ...args: unknown[]
  ): ReturnType<typeof setTimeout> {
    if (hasNuked && shouldNuke) {
      return -1 as unknown as ReturnType<typeof setTimeout>;
    }
    const timeoutId = setTimeout(callback, delay, ...args);
    timeoutMap.push({ timeoutId, shouldNuke });
    allTimeoutIds.add(timeoutId);
    return timeoutId;
  }

  function delay(ms: number, shouldNuke: boolean = false): Promise<void> {
    if (hasNuked && shouldNuke) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => setCustomTimeout(() => resolve(), ms, shouldNuke));
  }

  function clearTimeouts(): void {
    timeoutMap.forEach((item) => {
      if (item.shouldNuke) {
        clearTimeout(item.timeoutId);
        allTimeoutIds.delete(item.timeoutId);
      }
    });
  }

  function addEventListener(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(event, handler, options);
    allListeners.push({ target, event, handler, options });
  }

  // =========================================================================
  // Utility: Styling & DOM Queries
  // =========================================================================

  function getRandomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  function getCssVariableDuration(element: Element, variableName: string): number {
    const rootStyles = getComputedStyle(element);
    const duration = parseFloat(rootStyles.getPropertyValue(variableName)) * 1000; // seconds to ms
    return duration || 600;
  }

  function updateStyles(
    element: Element,
    styles: Record<string, string | null | undefined>
  ): void {
    Object.entries(styles).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        (element as HTMLElement).style[key as any] = value;
      }
    });
  }

  function getTranslateValues(element: Element): { x: number; y: number } {
    const style = window.getComputedStyle(element);
    const matrix = new DOMMatrix(style.transform);
    return { x: matrix.m41, y: matrix.m42 };
  }

  // =========================================================================
  // Utility: Random & Metric
  // =========================================================================

  function getRandomPercentage(stg: number): number {
    const stages = [
      { min: 10, max: 15 },
      { min: 16, max: 20 },
      { min: 21, max: 25 },
      { min: 20, max: 30 }
    ];
    const { min, max } = stages[Math.min(stg - 1, stages.length - 1)];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async function updateMetric(container: Element | null): Promise<void> {
    const isHero = container?.closest('.hero') !== null;
    if (hasNuked && isHero) return;

    const metric = container?.querySelector('.metric');
    if (!metric) return;

    const metricNumber = metric.querySelector('.metric__number');
    if (!metricNumber) return;

    const randomPercentage = getRandomPercentage(++stage);
    metricNumber.textContent = `${randomPercentage}%`;

    updateStyles(metric, {
      opacity: '0',
      top: '0',
      transition: 'none'
    });

    await delay(1, isHero);
    if (hasNuked && isHero) return;

    updateStyles(metric, {
      opacity: '1',
      top: '-42px',
      transition: 'opacity 400ms var(--easing-cubic-bezier), top 400ms var(--easing-cubic-bezier)'
    });

    await delay(2000, isHero);
    if (hasNuked && isHero) return;

    updateStyles(metric, {
      opacity: '0',
      top: '0'
    });
  }

  // =========================================================================
  // Cursor Cloning & Animation
  // =========================================================================

  function cloneCursor(
    originalCursor: Element,
    horizontalSide: string | null,
    verticalSide: string | null,
    shouldReset: boolean,
    isHero: boolean
  ): Element | void {
    if (hasNuked && isHero) return;

    const clonedCursor = originalCursor.cloneNode(true) as Element;
    clonedElements.push(clonedCursor);

    if (isHero) {
      clonedCursor.setAttribute('data-should-reset', 'true');
    }

    const rect = originalCursor.getBoundingClientRect();
    positionCursor(clonedCursor, rect);

    if (shouldReset) {
      resetCursor(clonedCursor);
    } else {
      randomizeCursorPosition(clonedCursor, horizontalSide, verticalSide);
    }

    const cursorContainer = root.querySelector('.cursor-container');
    if (!cursorContainer) return;

    cursorContainer.appendChild(clonedCursor);

    // Hide original cursor
    const htmlOriginal = originalCursor as HTMLElement;
    if (!originalOpacities.has(originalCursor)) {
      originalOpacities.set(originalCursor, htmlOriginal.style.opacity);
    }
    htmlOriginal.style.opacity = '0';

    return clonedCursor;
  }

  function positionCursor(clonedCursor: Element, rect: DOMRect): void {
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    const html = clonedCursor as HTMLElement;
    html.style.position = 'absolute';
    html.style.left = `${rect.left + scrollLeft}px`;
    html.style.top = `${rect.top + scrollTop}px`;
  }

  function resetCursor(clonedCursor: Element): void {
    const html = clonedCursor as HTMLElement;
    html.style.opacity = '1';
    html.style.transform = 'translate(0, 0)';
  }

  function getAllowedMovementRange(
    cursorRect: DOMRect,
    viewportSize: { width: number; height: number },
    side: string,
    axis: string,
    minRange: number,
    maxRange: number
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

    maxMovement = Math.max(0, maxMovement);
    maxMovement = Math.min(maxMovement, maxRange);
    const minMovement = Math.min(minRange, maxMovement);

    return { minMovement, maxMovement };
  }

  function randomizeCursorPosition(
    clonedCursor: Element,
    horizontalSide: string | null,
    verticalSide: string | null
  ): void {
    const cursorRect = clonedCursor.getBoundingClientRect();
    const viewportSize = {
      width: window.innerWidth,
      height: window.innerHeight
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
        RANDOM_POSITION_RANGE_X.MAX
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
        RANDOM_POSITION_RANGE_Y.MAX
      );
      if (maxMovement > 0) {
        const randomY = getRandomInRange(minMovement, maxMovement);
        moveY = verticalSide === 'top' ? -randomY : randomY;
      }
    }

    const html = clonedCursor as HTMLElement;
    html.style.opacity = '0';
    html.style.transform = `translate(${moveX}px, ${moveY}px)`;
  }

  function calculateCursorMovement(
    cursor: Element,
    horizontalSide: string | null,
    verticalSide: string | null
  ): { moveX: number; moveY: number } {
    const cursorRect = cursor.getBoundingClientRect();
    const viewportSize = {
      width: window.innerWidth,
      height: window.innerHeight
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
        RANDOM_POSITION_RANGE_X.MAX
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
        RANDOM_POSITION_RANGE_Y.MAX
      );
      if (maxMovement > 0) {
        const randomY = getRandomInRange(minMovement, maxMovement);
        moveY = verticalSide === 'top' ? -randomY : randomY;
      }
    }

    return { moveX, moveY };
  }

  function calculateDistance(x: number, y: number): number {
    return Math.sqrt(x ** 2 + y ** 2);
  }

  function setupCursorTransition(cursor: Element, moveX: number, moveY: number, duration: number): void {
    const fadeOutDelay = duration - FADE_OUT_DURATION;
    const html = cursor as HTMLElement;
    html.style.transition = `transform ${duration}ms var(--easing-cubic-bezier), opacity ${FADE_OUT_DURATION}ms var(--easing-cubic-bezier) ${fadeOutDelay}ms`;
  }

  function animateCursor(
    cursor: Element,
    horizontalSide: string | null,
    verticalSide: string | null,
    shouldNuke: boolean = false
  ): void {
    if (hasNuked && shouldNuke) return;

    const { moveX, moveY } = calculateCursorMovement(cursor, horizontalSide, verticalSide);
    const distance = calculateDistance(moveX, moveY);
    const transitionDuration = distance * 2;

    setupCursorTransition(cursor, moveX, moveY, transitionDuration);

    const html = cursor as HTMLElement;
    html.style.transform = `translate(${moveX}px, ${moveY}px)`;
    html.style.opacity = '0';
  }

  function handleCursorAnimation(
    originalCursor: Element | null,
    state: AnimationState,
    isHero: boolean
  ): Element | void {
    if (!originalCursor || (hasNuked && isHero)) return;

    const html = originalCursor as HTMLElement;
    html.style.transition = 'none';
    html.style.transform = 'translate(0, 0)';
    html.style.opacity = '0';

    const clonedCursor = cloneCursor(originalCursor, state.horizontalSide, state.verticalSide, false, isHero);
    if (!clonedCursor) return;

    const { x: currentTranslateX, y: currentTranslateY } = getTranslateValues(clonedCursor);
    const clonedMoveX = -currentTranslateX;
    const clonedMoveY = -currentTranslateY;
    const distance = Math.sqrt(clonedMoveX ** 2 + clonedMoveY ** 2);
    const transitionDuration = distance * 2;

    const clonedHtml = clonedCursor as HTMLElement;
    clonedHtml.style.transition = `transform ${transitionDuration}ms var(--easing-cubic-bezier), opacity ${FADE_OUT_DURATION}ms var(--easing-cubic-bezier) ${transitionDuration - FADE_OUT_DURATION}ms`;
    clonedHtml.style.transform = 'translate(0, 0)';
    clonedHtml.style.opacity = '1';

    return clonedCursor;
  }

  // =========================================================================
  // Content Cloning & Animation
  // =========================================================================

  function cloneContent(originalContent: Element, shouldNuke: boolean = false): Element | void {
    if (hasNuked && shouldNuke) return;

    const clonedContent = originalContent.cloneNode(true) as Element;
    clonedElements.push(clonedContent);

    if (shouldNuke) {
      clonedContent.setAttribute('data-should-reset', 'true');
    }

    const html = clonedContent as HTMLElement;
    html.style.position = 'absolute';
    html.style.opacity = '0';
    html.style.zIndex = '9999';
    html.style.transition = 'none';

    return clonedContent;
  }

  function animateClonedContent(state: AnimationState, clonedContent: Element): void {
    if (!clonedContent) return;

    const html = clonedContent as HTMLElement;
    html.style.transition =
      state.horizontalStartDistance === '0px' && state.verticalStartDistance === '0px'
        ? `opacity ${state.animationDuration}ms var(--easing-cubic-bezier) ${state.animationDelay}ms`
        : `all ${state.animationDuration}ms var(--easing-cubic-bezier) ${state.animationDelay}ms`;

    if (state.horizontalSide) {
      html.style[state.horizontalSide as any] = '0';
    }
    if (state.verticalSide) {
      html.style[state.verticalSide as any] = '0';
    }
    html.style.opacity = '1';
  }

  function removeClonedContent(
    container: Element | null,
    clonedContent: Element,
    originalContent: Element
  ): void {
    if (!container || !clonedContent) return;
    container.removeChild(clonedContent);
    const html = originalContent as HTMLElement;
    html.style.opacity = '1';
  }

  function hideOriginalContent(originalContent: Element, state: AnimationState): void {
    if (!originalContent) return;

    const html = originalContent as HTMLElement;
    html.style.transition = '-webkit-backdrop-filter 200ms var(--easing-cubic-bezier), backdrop-filter 200ms var(--easing-cubic-bezier), border-color 200ms var(--easing-cubic-bezier)';
    html.style.backdropFilter = 'blur(0px)';
    (html.style as any).webkitBackdropFilter = 'blur(0px)';
    html.style.borderColor = 'transparent';

    originalContent.querySelectorAll('.tag').forEach((element) => {
      const tagHtml = element as HTMLElement;
      tagHtml.style.transition = 'opacity 200ms var(--easing-cubic-bezier)';
      tagHtml.style.opacity = '0';
    });
  }

  function showContainer(container: Element): void {
    const isHero = container.closest('.hero') !== null;
    if (hasNuked && isHero) return;
    const html = container as HTMLElement;
    html.style.opacity = '1';
  }

  // =========================================================================
  // Text Animation: Typing, Fading, Retype
  // =========================================================================

  function toggleTextAnimation(element: Element, animationType: 'in' | 'out'): void {
    if (animationType === 'in') {
      element.classList.remove('hidden', 'animate-out');
      element.classList.add('visible', 'animate-in');
    } else if (animationType === 'out') {
      element.classList.remove('visible', 'animate-in');
      element.classList.add('hidden', 'animate-out');
    }
  }

  async function fadeInText(retypeElement: Element, fullText: string, shouldNuke: boolean): Promise<void> {
    const letterEffectDuration = getCssVariableDuration(document.documentElement, '--letter-effect-duration');

    const words = fullText.split(' ');
    retypeElement.innerHTML = '';

    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.classList.add('letter-effect', 'hidden');
      span.textContent = word;
      retypeElement.appendChild(span);

      if (index < words.length - 1) {
        retypeElement.appendChild(document.createTextNode(' '));
      }
    });

    const spans = retypeElement.querySelectorAll('span');

    for (let i = 0; i < spans.length; i++) {
      toggleTextAnimation(spans[i], 'in');
      await delay(letterEffectDuration * 0.3, shouldNuke);
    }
  }

  async function fadeOutText(retypeElement: Element, shouldNuke: boolean): Promise<void> {
    const letterEffectDuration = getCssVariableDuration(document.documentElement, '--letter-effect-duration');
    const spans = retypeElement.querySelectorAll('span');

    for (let i = 0; i < spans.length; i++) {
      toggleTextAnimation(spans[i], 'out');
      await delay(letterEffectDuration * 0.3, shouldNuke);
    }
  }

  function typeText(
    element: Element,
    text: string,
    index: number,
    speed: number,
    chunkSize: number,
    shouldNuke: boolean,
    callback?: () => void
  ): void {
    if (hasNuked && shouldNuke) return;

    if (text && text.length > 0) {
      if (index < text.length) {
        const nextIndex = Math.min(index + chunkSize, text.length);
        const nextText = text.slice(0, nextIndex);

        element.innerHTML = nextText + `<span class="thin-cursor" ${shouldNuke ? 'data-should-reset="true"' : ''}>|</span>`;

        setCustomTimeout(
          () => {
            if (hasNuked && shouldNuke) return;
            typeText(element, text, nextIndex, speed, chunkSize, shouldNuke, callback);
          },
          speed,
          shouldNuke
        );
      } else if (callback) {
        element.innerHTML = text;
        callback();
      }
    }
  }

  async function typingAnimation(
    retypeElement: Element,
    fullText: string,
    shouldNuke: boolean,
    useFadeEffect: boolean = false,
    callback?: () => void
  ): Promise<void> {
    if (hasNuked && shouldNuke) return;

    if (useFadeEffect) {
      await fadeInText(retypeElement, fullText, shouldNuke);
      if (callback) callback();
    } else {
      typeText(retypeElement, fullText, 0, 150, 3, shouldNuke, callback);
    }
  }

  async function showElement(
    state: AnimationState,
    settings: Element,
    originalContent: Element,
    clonedContent: Element,
    container: Element
  ): Promise<void> {
    showContainer(container);
    animateClonedContent(state, clonedContent);

    const isHero = container.closest('.hero') !== null;

    await delay(parseInt(state.animationDuration) + parseInt(state.animationDelay), isHero);

    if (hasNuked && isHero) return;

    removeClonedContent(container, clonedContent, originalContent);

    const originalCursor = originalContent.querySelector('.cursor');
    if (originalCursor) {
      const clonedCursor = cloneCursor(originalCursor, state.horizontalSide, state.verticalSide, true, isHero);

      await delay(200, isHero);
      if (hasNuked && isHero) return;

      hideOriginalContent(originalContent, state);
      updateMetric(container);

      if (clonedCursor) {
        animateCursor(clonedCursor, state.horizontalSide, state.verticalSide, isHero);

        const computedStyle = getComputedStyle(clonedCursor);
        const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000;

        await delay(transitionDuration + 4000, isHero);

        setUpRetypeAnimation(originalContent, container, settings, state);
      }
    }
  }

  function setUpRetypeAnimation(
    originalContent: Element,
    container: Element,
    settings: Element,
    state: AnimationState
  ): void {
    currentVersion = 1;
    if (settings.getAttribute('data-animation-retype') !== 'true') return;
    retypeAnimation(originalContent, container, settings, state);
  }

  async function resetRetypeAnimation(
    originalContent: Element,
    settings: Element,
    state: AnimationState,
    container: Element,
    clonedCursor: Element,
    isHero: boolean
  ): Promise<void> {
    if (hasNuked && isHero) return;

    // Hide content-related styles
    const html = originalContent as HTMLElement;
    html.style.borderColor = 'transparent';
    originalContent.querySelectorAll('.tag').forEach((element) => {
      const tagHtml = element as HTMLElement;
      tagHtml.style.opacity = '0';
    });

    // Move cursor away before next animation
    animateCursor(clonedCursor, state.horizontalSide, state.verticalSide, isHero);

    const computedStyle = getComputedStyle(clonedCursor);
    const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000;

    await delay(transitionDuration, isHero);

    updateMetric(container);

    await delay(4000, isHero);

    retypeAnimation(originalContent, container, settings, state);
  }

  async function retypeAnimation(
    originalContent: Element,
    container: Element,
    settings: Element,
    state: AnimationState
  ): Promise<void> {
    const isHero = container.closest('.hero') !== null;
    if (hasNuked && isHero) return;

    const retypeElements = originalContent.querySelectorAll('[data-retype-text="true"]');
    const loopEnabled = settings.getAttribute('data-animation-retype-loop') === 'true';

    // If all versions displayed and loop enabled, reset to version 0
    if (currentVersion >= 3) {
      if (loopEnabled) {
        currentVersion = 0;
      } else {
        return;
      }
    }

    const retypeElement = retypeElements[0];
    if (!retypeElement) return;

    const fullText = retypeElement.getAttribute(`data-retype-version-${currentVersion + 1}`);
    if (!fullText || fullText.trim() === '') return;

    // Wrap current text in spans if they don't exist
    if (!retypeElement.querySelector('span')) {
      const words = retypeElement.textContent?.split(' ') ?? [];
      retypeElement.innerHTML = '';

      words.forEach((word, index) => {
        const span = document.createElement('span');
        span.classList.add('letter-effect', 'visible');
        span.textContent = word;
        retypeElement.appendChild(span);

        if (index < words.length - 1) {
          retypeElement.appendChild(document.createTextNode(' '));
        }
      });
    }

    const originalCursor = originalContent.querySelector('.cursor');
    if (!originalCursor) return;

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

  // =========================================================================
  // State Initialization & Configuration
  // =========================================================================

  interface AnimationState {
    horizontalSide: string | null;
    horizontalStartDistance: string;
    verticalSide: string | null;
    verticalStartDistance: string;
    animationDelay: string;
    animationDuration: string;
    originalBorderColor: string;
  }

  function ensurePixelSuffix(value: string): string {
    return value.includes('px') ? value : `${value}px`;
  }

  function initializeState(settings: Element, originalContent: Element): AnimationState {
    const isMobile = window.innerWidth <= 991;
    const horizontalSide =
      settings.getAttribute(isMobile ? 'data-animation-horizontal-side-mobile' : 'data-animation-horizontal-side') || '';
    const verticalSide =
      settings.getAttribute(isMobile ? 'data-animation-vertical-side-mobile' : 'data-animation-vertical-side') || '';

    return {
      horizontalSide: horizontalSide || null,
      horizontalStartDistance: ensurePixelSuffix(
        settings.getAttribute('data-animation-horizontal-start-distance') || '-200'
      ),
      verticalSide: verticalSide || null,
      verticalStartDistance: ensurePixelSuffix(
        settings.getAttribute('data-animation-vertical-start-distance') || '-200'
      ),
      animationDelay: settings.getAttribute('data-animation-delay') || '0',
      animationDuration: settings.getAttribute('data-animation-duration') || '2000',
      originalBorderColor: getComputedStyle(originalContent).borderColor
    };
  }

  function setStartPosition(state: AnimationState, clonedContent: Element): void {
    if (!clonedContent) return;

    const html = clonedContent as HTMLElement;
    if (state.horizontalStartDistance !== '0px' && state.horizontalSide) {
      html.style[state.horizontalSide as any] = state.horizontalStartDistance;
    }
    if (state.verticalStartDistance !== '0px' && state.verticalSide) {
      html.style[state.verticalSide as any] = state.verticalStartDistance;
    }
  }

  async function resetElementOnResize(
    clonedContent: Element,
    state: AnimationState,
    originalContent: Element,
    container: Element
  ): Promise<void> {
    const isHero = container.closest('.hero') !== null;
    if (hasNuked && isHero) return;

    if (clonedContent) {
      const html = clonedContent as HTMLElement;
      html.style.transition = 'none';
      html.style[state.horizontalSide || 'left' as any] = '0';
      html.style[state.verticalSide || 'top' as any] = '0';
      html.style.opacity = '1';

      container.removeChild(clonedContent);
    }

    const origHtml = originalContent as HTMLElement;
    origHtml.style.opacity = '1';

    await delay(300, isHero);
    if (hasNuked && isHero) return;

    resetOriginalContentStyle(originalContent);
    resetTagsAndCursors(originalContent, container, state);
  }

  function resetOriginalContentStyle(originalContent: Element): void {
    const html = originalContent as HTMLElement;
    html.style.transition = 'backdrop-filter 200ms var(--easing-cubic-bezier), border-color 200ms var(--easing-cubic-bezier)';
    html.style.backdropFilter = 'blur(0px)';
    html.style.borderColor = 'transparent';
  }

  function resetTagsAndCursors(originalContent: Element, container: Element, state: AnimationState): void {
    const isHero = container.closest('.hero') !== null;
    if (hasNuked && isHero) return;

    originalContent.querySelectorAll('.tag').forEach((element) => {
      const html = element as HTMLElement;
      html.style.opacity = '0';
    });

    originalContent.querySelectorAll('.cursor').forEach((cursor) => {
      const clonedCursor = cloneCursor(cursor, state.horizontalSide, state.verticalSide, false, isHero);
      if (clonedCursor) {
        animateCursor(clonedCursor, state.horizontalSide, state.verticalSide);
      }
    });

    updateMetric(container);
  }

  // =========================================================================
  // Hero Section Reset (when scrolled out of view)
  // =========================================================================

  function resetHeroAnimations(): void {
    if (hasNuked) return;

    hasNuked = true;
    clearTimeouts();

    const cursorAnimations = $all('.hero .cursor-animation', root);

    cursorAnimations.forEach((container) => {
      const contentElements = Array.from(container.children).filter(
        (child) => !child.classList.contains('cursor-animation__settings')
      );
      if (contentElements.length === 0) return;

      const originalContent = contentElements[0] as Element;
      const retypeElements = originalContent.querySelectorAll('[data-retype-text="true"]');
      const metricElement = container.querySelector('.metric');
      const clonedContents = root.querySelectorAll('[data-should-reset="true"]');

      // Restore final text version
      retypeElements.forEach((retypeElement) => {
        const finalTextVersion =
          retypeElement.getAttribute('data-retype-version-3') ||
          retypeElement.getAttribute('data-retype-version-2') ||
          retypeElement.getAttribute('data-retype-version-1');
        if (finalTextVersion) {
          (retypeElement as HTMLElement).innerText = finalTextVersion;
        }
      });

      const origHtml = originalContent as HTMLElement;
      origHtml.style.transition = 'none';
      origHtml.style.opacity = '1';
      origHtml.style.backdropFilter = 'blur(0px)';
      (origHtml.style as any).webkitBackdropFilter = 'blur(0px)';
      origHtml.style.borderColor = 'transparent';

      if (metricElement) {
        const metricHtml = metricElement as HTMLElement;
        metricHtml.style.transition = 'none';
        metricHtml.style.opacity = '0';
      }

      container.querySelectorAll('.tag').forEach((tag) => {
        const tagHtml = tag as HTMLElement;
        tagHtml.style.transition = 'none';
        tagHtml.style.opacity = '0';
      });

      clonedContents.forEach((clonedContent) => {
        clonedContent.remove();
      });

      container.querySelectorAll('.cursor, .thin-cursor').forEach((cursor) => {
        const cursorHtml = cursor as HTMLElement;
        cursorHtml.style.transition = 'none';
        cursorHtml.style.opacity = '0';
      });

      setCustomTimeout(() => {
        $all('.hero .cursor-animation', root).forEach((element) => {
          const html = element as HTMLElement;
          html.style.opacity = '1';
        });
      }, 100);
    });
  }

  // =========================================================================
  // Main Initialization
  // =========================================================================

  function initWrapText(): void {
    const textElement = root.querySelector('h1[data-retype-text="true"]');

    if (textElement && !textElement.querySelector('span')) {
      const words = textElement.textContent?.split(' ') ?? [];
      textElement.innerHTML = '';

      words.forEach((word, index) => {
        const span = document.createElement('span');
        span.classList.add('letter-effect', 'visible');
        span.textContent = word;
        textElement.appendChild(span);

        if (index < words.length - 1) {
          textElement.appendChild(document.createTextNode(' '));
        }
      });
    }
  }

  function initAnimations(): void {
    const cursorAnimationElements = $all('.cursor-animation', root);

    cursorAnimationElements.forEach((container) => {
      const settings = container.querySelector('.cursor-animation__settings');
      if (!settings) return;

      const contentElements = Array.from(container.children).filter(
        (child) => !child.classList.contains('cursor-animation__settings')
      );
      if (contentElements.length === 0) return;

      const originalContent = contentElements[0] as Element;
      const clonedContent = cloneContent(originalContent, false);
      if (!clonedContent) return;

      const state = initializeState(settings, originalContent);

      setStartPosition(state, clonedContent);
      const originalRect = originalContent.getBoundingClientRect();
      const clonedHtml = clonedContent as HTMLElement;
      clonedHtml.style.width = `${originalRect.width}px`;
      clonedHtml.style.height = `${originalRect.height}px`;

      const origHtml = originalContent as HTMLElement;
      origHtml.style.opacity = '0';
      container.appendChild(clonedContent);

      let animationTimeout: ReturnType<typeof setTimeout>;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const isHeroNow = container.closest('.hero') !== null;

              animationTimeout = setCustomTimeout(
                () => {
                  if (hasNuked && isHeroNow) return;
                  showElement(state, settings, originalContent, clonedContent, container);
                },
                50,
                isHeroNow
              );
            }
          });
        },
        {
          threshold: window.innerWidth >= 992 ? 0.8 : 0.5,
          rootMargin: '0px'
        }
      );

      observer.observe(container);
      allObservers.push(observer);

      const handleResize = (): void => {
        clearTimeout(animationTimeout);
        resetElementOnResize(clonedContent, state, originalContent, container);
      };

      addEventListener(window, 'resize', handleResize);

      setCustomTimeout(
        () => {
          // Remove resize listener after animation completes
          const idx = allListeners.findIndex((item) => item.handler === handleResize);
          if (idx !== -1) {
            const listener = allListeners[idx];
            listener.target.removeEventListener(listener.event, listener.handler, listener.options);
            allListeners.splice(idx, 1);
          }
        },
        parseInt(state.animationDuration) + parseInt(state.animationDelay)
      );
    });
  }

  // =========================================================================
  // Event Listeners for Load & Scroll
  // =========================================================================

  const handleScroll = (): void => {
    const heroElement = root.querySelector('.hero') as HTMLElement | null;
    if (!heroElement) return;

    const heroRect = heroElement.getBoundingClientRect();

    if (heroRect.bottom < 0) {
      resetHeroAnimations();
    }
  };

  addEventListener(window, 'scroll', handleScroll);

  // Handle DOMContentLoaded (set initial opacity)
  const handleDOMReady = (): void => {
    const cursorAnimationElements = $all('.cursor-animation', root);
    cursorAnimationElements.forEach((element) => {
      const html = element as HTMLElement;
      html.style.opacity = '0';
    });
  };

  if (document.readyState === 'loading') {
    addEventListener(document, 'DOMContentLoaded', handleDOMReady);
  } else {
    handleDOMReady();
  }

  // Handle window.load (main animation setup)
  const handleLoad = (): void => {
    initWrapText();
    initAnimations();
  };

  if (document.readyState === 'complete') {
    handleLoad();
  } else {
    addEventListener(window, 'load', handleLoad, { once: true });
  }

  // =========================================================================
  // Teardown
  // =========================================================================

  return () => {
    // Stop all pending timeouts
    allTimeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
    allTimeoutIds.clear();
    timeoutMap.length = 0;

    // Remove all listeners
    allListeners.forEach(({ target, event, handler, options }) => {
      target.removeEventListener(event, handler, options);
    });
    allListeners.length = 0;

    // Disconnect all observers
    allObservers.forEach((observer) => observer.disconnect());
    allObservers.length = 0;

    // Remove cloned elements from DOM
    clonedElements.forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    clonedElements.length = 0;

    // Restore original opacity values
    originalOpacities.forEach((opacity, element) => {
      const html = element as HTMLElement;
      html.style.opacity = opacity;
    });
    originalOpacities.clear();
  };
}
