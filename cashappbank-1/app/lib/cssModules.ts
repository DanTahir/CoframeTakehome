/**
 * Helpers for working with the captured page's CSS-module class names.
 *
 * The original site is a Next.js app whose class names are hashed per module,
 * e.g. `gallery-faq-item-module-sass-module__hdnKja__answer`. State classes are
 * siblings *within the same module*, so an element carrying `...__hdnKja__answer`
 * implies the state class `...__hdnKja__active`.
 *
 * Deriving state classes from an element's own class list keeps these effects
 * independent of any specific build hash: if the site is re-captured and the
 * hashes change, none of this needs editing.
 */

/**
 * Returns the module prefix for `local` — the matching class name with its
 * trailing local name removed (the `__` separator is kept) — or null.
 *
 * `modulePrefix(answerEl, 'answer')`
 *   -> 'gallery-faq-item-module-sass-module__hdnKja__'
 */
export function modulePrefix(el: Element, local: string): string | null {
  for (const cls of Array.from(el.classList)) {
    if (cls.endsWith(`__${local}`)) return cls.slice(0, cls.length - local.length);
  }
  return null;
}

/**
 * Derives a sibling state class from an element known to carry `local`.
 *
 * `siblingClass(answerEl, 'answer', 'active')`
 *   -> 'gallery-faq-item-module-sass-module__hdnKja__active'
 */
export function siblingClass(el: Element, local: string, state: string): string | null {
  const prefix = modulePrefix(el, local);
  return prefix ? prefix + state : null;
}

/**
 * Toggles the sibling state class for `local` on `el`. No-ops when the element
 * does not carry a recognisable module class.
 */
export function toggleSibling(el: Element, local: string, state: string, on: boolean): void {
  const cls = siblingClass(el, local, state);
  if (cls) el.classList.toggle(cls, on);
}

/** First descendant whose class list contains a `__local` class. */
export function findByLocal<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  local: string,
): T | null {
  return root.querySelector<T>(`[class*="__${local}"]`);
}

/** All descendants whose class list contains a `__local` class. */
export function findAllByLocal<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  local: string,
): T[] {
  return Array.from(root.querySelectorAll<T>(`[class*="__${local}"]`));
}
