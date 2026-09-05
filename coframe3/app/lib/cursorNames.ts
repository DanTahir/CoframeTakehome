/**
 * Assigns a random visitor name to the non-Coframe cursor labels.
 *
 * Faithful port: for each `.cursor-animation`, one name is drawn and applied to
 * every `.cursor[data-is-coframe-cursor="false"]` label inside it.
 */

export const CURSOR_NAMES = [
  'James', 'Josh', 'Liam', 'Oliver', 'Noah', 'William', 'Ben', 'Henry', 'Alex',
  'Olivia', 'Emma', 'Sarah', 'Elizabeth', 'Laura', 'Anna', 'Rachel', 'Rebecca',
  'Jessica',
] as const;

export type CursorName = (typeof CURSOR_NAMES)[number];

export function pickCursorName(random: () => number = Math.random): CursorName {
  return CURSOR_NAMES[Math.floor(random() * CURSOR_NAMES.length)];
}

export function initCursorNames(
  root: ParentNode = document,
  random: () => number = Math.random,
): void {
  for (const animation of Array.from(root.querySelectorAll<HTMLElement>('.cursor-animation'))) {
    const cursors = Array.from(
      animation.querySelectorAll<HTMLElement>('.cursor[data-is-coframe-cursor="false"]'),
    );
    if (cursors.length === 0) continue;

    const name = pickCursorName(random);
    for (const cursor of cursors) {
      const label = cursor.querySelector<HTMLElement>('#cursor__text');
      if (label) label.textContent = name;
    }
  }
}
