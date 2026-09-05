/**
 * Vitest/jsdom setup.
 *
 * jsdom implements neither IntersectionObserver nor ResizeObserver, and both
 * are used by the ported runtime modules. Rather than stubbing them into
 * no-ops, these fakes record their observed elements and expose a manual
 * `trigger`, so tests can drive scroll-into-view behaviour deterministically
 * instead of waiting on real layout.
 */

import { afterEach, vi } from 'vitest';

export interface FakeIntersectionObserver {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observed: Element[];
  disconnected: boolean;
  trigger(target: Element, isIntersecting?: boolean): void;
}

declare global {
  // eslint-disable-next-line no-var
  var __observers: FakeIntersectionObserver[];
}

globalThis.__observers = [];

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  private record: FakeIntersectionObserver;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    const self = this;
    this.record = {
      callback,
      options,
      observed: [],
      disconnected: false,
      trigger(target: Element, isIntersecting = true) {
        callback(
          [
            {
              target,
              isIntersecting,
              intersectionRatio: isIntersecting ? 1 : 0,
              boundingClientRect: target.getBoundingClientRect(),
              intersectionRect: target.getBoundingClientRect(),
              rootBounds: null,
              time: 0,
            } as IntersectionObserverEntry,
          ],
          self,
        );
      },
    };
    globalThis.__observers.push(this.record);
  }

  observe(target: Element): void {
    this.record.observed.push(target);
  }

  unobserve(target: Element): void {
    this.record.observed = this.record.observed.filter((el) => el !== target);
  }

  disconnect(): void {
    this.record.disconnected = true;
    this.record.observed = [];
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

class MockResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
vi.stubGlobal('ResizeObserver', MockResizeObserver);

/** Returns the observer created for `target`, for driving it manually. */
export function observerFor(target: Element): FakeIntersectionObserver | undefined {
  return globalThis.__observers.find((o) => o.observed.includes(target));
}

export function lastObserver(): FakeIntersectionObserver | undefined {
  return globalThis.__observers[globalThis.__observers.length - 1];
}

afterEach(() => {
  globalThis.__observers = [];
  document.body.innerHTML = '';
  document.documentElement.className = '';
});
