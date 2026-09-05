// Randomised collaborator name shown in the non-Coframe cursor labels.
// Ported from the page's inline names script: one random name per
// .cursor-animation, applied to every .cursor[data-is-coframe-cursor="false"]
// inside it.

export const CURSOR_NAMES = [
  'James', 'Josh', 'Liam', 'Oliver', 'Noah', 'William', 'Ben', 'Henry', 'Alex',
  'Olivia', 'Emma', 'Sarah', 'Elizabeth', 'Laura', 'Anna', 'Rachel', 'Rebecca',
  'Jessica',
];

export function initCursorNames(root: ParentNode = document): void {
  root.querySelectorAll('.cursor-animation').forEach((cursorAnimation) => {
    const cursors = cursorAnimation.querySelectorAll(
      '.cursor[data-is-coframe-cursor="false"]',
    );
    if (cursors.length === 0) return;

    const randomName = CURSOR_NAMES[Math.floor(Math.random() * CURSOR_NAMES.length)];

    cursors.forEach((cursor) => {
      // The source markup reuses this id across cursors, hence querySelector
      // per-cursor rather than a document lookup.
      const cursorTextElement = cursor.querySelector('#cursor__text');
      if (cursorTextElement) cursorTextElement.textContent = randomName;
    });
  });
}
