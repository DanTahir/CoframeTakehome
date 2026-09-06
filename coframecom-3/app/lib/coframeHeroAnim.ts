/**
 * Hero entrance fades — ported from Webflow IX2 action list "a-3"
 * ("Hero Animations"), which `webflow.js` used to run and which the codegen
 * sanitizer therefore strips.
 *
 * Transcribed verbatim from the IX2 payload in
 * `scrape/raw/js/webflow.schunk.571c3827ae3ad973.a275af80.js`:
 *
 *   events["e-3"] = { eventTypeId: "PAGE_START", actionListId: "a-3",
 *                     config.loop: false }
 *
 *   actionLists["a-3"] = { useFirstGroupAsInitialState: true, groups:
 *     G1 (initial state):
 *       STYLE_OPACITY 674d6aa7-...-b376  value 0  delay    0  duration 500
 *       STYLE_OPACITY 674d6aa7-...-b395  value 0  delay    0  duration 500
 *       STYLE_OPACITY 355463fa-...-5720  value 0  delay    0  duration   0
 *     G2:
 *       STYLE_OPACITY 355463fa-...-5720  value 1  delay  500  duration 300  easeInOut
 *     G3:
 *       STYLE_OPACITY 674d6aa7-...-b376  value 1  delay 1300  duration 300  easeInOut
 *       STYLE_OPACITY 674d6aa7-...-b395  value 1  delay 1700  duration 300  easeInOut
 *   }
 *
 * IX2 semantics reproduced here: items *within* a group run concurrently, each
 * honouring its own delay; groups run *sequentially*, the next starting once
 * the current group's longest (delay + duration) has elapsed. The first group
 * is applied instantly as the initial state rather than animated, because
 * `useFirstGroupAsInitialState` is true.
 *
 * Note on target 355463fa-200a-e35f-3f49-bfcb2e8a5720: it is present in the
 * IX2 data but NOT in this capture's markup (Coframe A/B-tests its own
 * homepage, which is their product). Its action items therefore resolve to no
 * element and are skipped — but their timings are still honoured, since IX2
 * derives group duration from the action config, not from what resolved. That
 * keeps the downstream groups' start times faithful.
 *
 * Note on 674d6aa7-...-b376 (`.hero__cta`): it is ALSO a `.fade-in` element
 * carrying data-fade-delay="l", so upstream both this IX2 list and the site's
 * own scroll fade-in script act on it. That overlap is reproduced rather than
 * resolved — the original page has exactly the same two owners.
 */
import { prefersReducedMotion, type EffectInit, type Teardown } from './runtime';

interface OpacityAction {
  /** data-w-id of the IX2 target. */
  targetId: string;
  value: number;
  delay: number;
  duration: number;
  easing: string;
}

/** Group 1 of action list "a-3" — applied instantly as the initial state. */
const INITIAL_STATE: OpacityAction[] = [
  { targetId: '674d6aa7-c193-2fe4-61dd-3519f496b376', value: 0, delay: 0, duration: 500, easing: '' },
  { targetId: '674d6aa7-c193-2fe4-61dd-3519f496b395', value: 0, delay: 0, duration: 500, easing: '' },
  { targetId: '355463fa-200a-e35f-3f49-bfcb2e8a5720', value: 0, delay: 0, duration: 0, easing: '' },
];

/** Groups 2..n of action list "a-3", in order. */
const GROUPS: OpacityAction[][] = [
  [
    {
      targetId: '355463fa-200a-e35f-3f49-bfcb2e8a5720',
      value: 1,
      delay: 500,
      duration: 300,
      easing: 'easeInOut',
    },
  ],
  [
    {
      targetId: '674d6aa7-c193-2fe4-61dd-3519f496b376',
      value: 1,
      delay: 1300,
      duration: 300,
      easing: 'easeInOut',
    },
    {
      targetId: '674d6aa7-c193-2fe4-61dd-3519f496b395',
      value: 1,
      delay: 1700,
      duration: 300,
      easing: 'easeInOut',
    },
  ],
];

/** Webflow easing names mapped to their CSS equivalents. */
function cssEasing(easing: string): string {
  switch (easing) {
    case 'easeInOut':
      return 'ease-in-out';
    case 'easeIn':
      return 'ease-in';
    case 'easeOut':
      return 'ease-out';
    default:
      return 'linear';
  }
}

function find(root: ParentNode, targetId: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-w-id="${targetId}"]`);
}

/** Longest (delay + duration) in a group — how long IX2 waits before the next. */
function groupDuration(group: OpacityAction[]): number {
  return group.reduce((max, a) => Math.max(max, a.delay + a.duration), 0);
}

export const initCoframeHeroAnim: EffectInit = (
  root: ParentNode = document,
): Teardown | void => {
  // No-op unless at least one of the action list's targets is on this page.
  const anyTarget =
    INITIAL_STATE.some((a) => find(root, a.targetId) !== null) ||
    GROUPS.some((g) => g.some((a) => find(root, a.targetId) !== null));
  if (!anyTarget) return;

  const timers: number[] = [];
  const animations: Animation[] = [];

  // Final resting state of the whole list, used for the reduced-motion path.
  const applyFinalState = () => {
    for (const group of GROUPS) {
      for (const action of group) {
        const el = find(root, action.targetId);
        if (el) el.style.opacity = String(action.value);
      }
    }
  };

  if (prefersReducedMotion()) {
    // Show the hero immediately rather than animating it in. Skipping the
    // animation without this would leave the initial state (opacity 0)
    // permanently applied, hiding real content.
    applyFinalState();
    return;
  }

  // --- IX2 group 1: initial state, applied instantly ----------------------
  for (const action of INITIAL_STATE) {
    const el = find(root, action.targetId);
    if (el) el.style.opacity = String(action.value);
  }

  // --- IX2 groups 2..n: sequential, items concurrent within a group -------
  let groupStart = 0;
  for (const group of GROUPS) {
    for (const action of group) {
      const at = groupStart + action.delay;
      timers.push(
        window.setTimeout(() => {
          const el = find(root, action.targetId);
          if (!el) return;
          const to = String(action.value);

          if (action.duration <= 0 || typeof el.animate !== 'function') {
            el.style.opacity = to;
            return;
          }

          const from = window.getComputedStyle(el).opacity;
          const animation = el.animate(
            [{ opacity: from }, { opacity: to }],
            { duration: action.duration, easing: cssEasing(action.easing), fill: 'both' },
          );
          animations.push(animation);
          // Commit the end state to an inline style so the element keeps it
          // once the animation object is released.
          animation.addEventListener('finish', () => {
            el.style.opacity = to;
          });
        }, at),
      );
    }
    groupStart += groupDuration(group);
  }

  return () => {
    for (const t of timers) window.clearTimeout(t);
    for (const a of animations) {
      try {
        a.cancel();
      } catch {
        /* teardown must never throw during unmount */
      }
    }
  };
};
