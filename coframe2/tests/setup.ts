// jsdom lacks the observer APIs and matchMedia that the ported behaviours use.
// These stubs record their observed targets so tests can trigger callbacks
// deterministically instead of relying on real layout/scrolling.

export interface FakeObserverRecord {
  callback: IntersectionObserverCallback;
  targets: Element[];
  options?: IntersectionObserverInit;
  disconnected: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __intersectionObservers: FakeObserverRecord[];
  // eslint-disable-next-line no-var
  var __resizeObserverCount: number;
}

globalThis.__intersectionObservers = [];
globalThis.__resizeObserverCount = 0;

class FakeIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];
  private record: FakeObserverRecord;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.record = { callback, targets: [], options, disconnected: false };
    if (options?.threshold !== undefined) {
      this.thresholds = Array.isArray(options.threshold)
        ? options.threshold
        : [options.threshold];
    }
    if (options?.rootMargin) this.rootMargin = options.rootMargin;
    globalThis.__intersectionObservers.push(this.record);
  }

  observe(target: Element): void {
    this.record.targets.push(target);
  }

  unobserve(target: Element): void {
    this.record.targets = this.record.targets.filter((t) => t !== target);
  }

  disconnect(): void {
    this.record.disconnected = true;
    this.record.targets = [];
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

class FakeResizeObserver implements ResizeObserver {
  constructor(_callback: ResizeObserverCallback) {
    globalThis.__resizeObserverCount += 1;
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.IntersectionObserver =
  FakeIntersectionObserver as unknown as typeof IntersectionObserver;
globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/** Fires the most recently created IntersectionObserver for `target`. */
export function triggerIntersection(target: Element, isIntersecting = true): boolean {
  const records = globalThis.__intersectionObservers.filter(
    (r) => !r.disconnected && r.targets.includes(target),
  );
  if (records.length === 0) return false;

  for (const record of records) {
    record.callback(
      [{ target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 } as
        unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  }
  return true;
}

/** Clears recorded observers between tests. */
export function resetObservers(): void {
  globalThis.__intersectionObservers = [];
  globalThis.__resizeObserverCount = 0;
}
