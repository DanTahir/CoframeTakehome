/**
 * Content-toggle section — re-implementation of `GalleryContentToggleSection`.
 *
 * Recovered logic:
 *
 *     const [active, setActive] = useState(0);
 *     // trigger:
 *     <GalleryButton onClick={() => select(i)} buttonStyle={i == active ? 'filled' : 'outlined'}
 *                    theme="dark" renderAsButtonOnMobile className={styles.toggleTrigger} />
 *     // panel:
 *     <div className={cx(styles.contentToggleItem, {[styles.active]: i === active})}
 *          data-active={i === active}>
 *
 * Two details recovered from the bundle that matter here:
 *
 *  - `styles.toggleTrigger` is **not** a key in that module's style map, so it
 *    resolves to `undefined` and `clsx` drops it. The captured triggers really
 *    do carry only `galleryButton darkFilled|darkOutlined disableMorph`, so the
 *    active-trigger hook is the `darkFilled` <-> `darkOutlined` swap, not a
 *    dedicated class.
 *  - The panels carry BOTH the `active` class and `data-active`, so both are
 *    updated here to keep CSS and any attribute selectors in agreement.
 */

import { modulePrefix, toggleSibling } from './cssModules';
import type { EffectInit, Teardown } from './runtime';

const WIRED_ATTR = 'data-replica-toggle-wired';

/** Swaps a gallery button between its filled and outlined dark variants. */
function paintTrigger(trigger: HTMLElement, active: boolean): void {
  const prefix = modulePrefix(trigger, 'galleryButton');
  if (!prefix) return;
  trigger.classList.toggle(`${prefix}darkFilled`, active);
  trigger.classList.toggle(`${prefix}darkOutlined`, !active);
  trigger.setAttribute('aria-selected', active ? 'true' : 'false');
}

export const initCashContentToggle: EffectInit = (
  root: ParentNode = document,
): Teardown | void => {
  const sections = Array.from(
    root.querySelectorAll<HTMLElement>('[class*="__galleryContentToggleSection"]'),
  );
  if (!sections.length) return;

  const teardowns: Teardown[] = [];

  for (const section of sections) {
    if (section.getAttribute(WIRED_ATTR) === '1') continue;

    const bar = section.querySelector<HTMLElement>('[class*="__toggleBar"]');
    const items = Array.from(
      section.querySelectorAll<HTMLElement>('[class*="__contentToggleItem"]'),
    );
    // A single-panel section renders no toggle bar at all (`toggleContent.length > 1`).
    if (!bar || items.length < 2) continue;

    const triggers = Array.from(bar.querySelectorAll<HTMLElement>('a, button'));
    if (triggers.length !== items.length) continue;

    section.setAttribute(WIRED_ATTR, '1');

    let activeIndex = items.findIndex((item) => item.getAttribute('data-active') === 'true');
    if (activeIndex < 0) activeIndex = 0;

    const select = (next: number) => {
      if (next === activeIndex) return; // matches the original's `if (i !== active)`
      activeIndex = next;
      items.forEach((item, i) => {
        const on = i === activeIndex;
        toggleSibling(item, 'contentToggleItem', 'active', on);
        item.setAttribute('data-active', on ? 'true' : 'false');
      });
      triggers.forEach((trigger, i) => paintTrigger(trigger, i === activeIndex));
    };

    // Normalise the starting state so classes/attributes agree.
    items.forEach((item, i) => {
      const on = i === activeIndex;
      toggleSibling(item, 'contentToggleItem', 'active', on);
      item.setAttribute('data-active', on ? 'true' : 'false');
    });
    triggers.forEach((trigger, i) => paintTrigger(trigger, i === activeIndex));

    triggers.forEach((trigger, index) => {
      const onClick = (event: Event) => {
        // Triggers are <a> elements without href; stop any focus/scroll jank.
        event.preventDefault();
        select(index);
      };
      trigger.addEventListener('click', onClick);
      teardowns.push(() => trigger.removeEventListener('click', onClick));
    });

    teardowns.push(() => section.removeAttribute(WIRED_ATTR));
  }

  if (!teardowns.length) return;
  return () => {
    for (const t of teardowns) t();
  };
};
