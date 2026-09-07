/**
 * Allows the non-standard `label` / `tag` attributes that Dropbox's own
 * component library leaks onto rendered DOM elements.
 *
 * WHY THIS EXISTS
 * ---------------
 * dropbox.com is built with an in-house design system ("dwg-*"). Several of its
 * components accept `label` / `tag` React props and forward their entire prop
 * bag to the underlying DOM node, so the *live* HTML really does contain:
 *
 *     <a class="dwg-text dwg-text-link ..." href="/desktop" aria-label=""
 *        label="Desktop app" data-trackingid="..." tag="">Desktop app</a>
 *
 * (Verified in scrape/raw/index.html — 50 such anchors, mostly in the footer
 * link planks.) Codegen reproduces captured attributes faithfully, so the
 * generated JSX carries them too, and `tsc` rejects them:
 *
 *     error TS2322: Property 'label' does not exist on type
 *     'DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, ...>'.
 *
 * Two ways to fix it, and the choice matters for fidelity:
 *
 *   1. Strip the attributes in codegen. Rejected: they are part of the real
 *      rendered document. A replica that silently deletes attributes the
 *      original serves is less faithful, and if any script or stylesheet ever
 *      keyed off `[label]` the divergence would be invisible. (Checked: no
 *      generated stylesheet uses an `[label]` or `[tag]` attribute selector
 *      today — but that is a property of this capture, not a guarantee.)
 *   2. Widen the types. Chosen: React passes unknown lowercase attributes
 *      straight through to the DOM at runtime, so this is purely a
 *      compile-time acknowledgement of what the markup already contains.
 *
 * Deliberately narrow: only these two names, and only as optional strings, so a
 * genuine typo in a real DOM attribute is still caught. Declared on
 * `HTMLAttributes` rather than `AnchorHTMLAttributes` because the design system
 * is free to forward the same props from any component, and a future re-capture
 * may well pick them up on a non-anchor element.
 */

import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    /** Design-system prop forwarded to the DOM by dwg-* link components. */
    label?: string;
    /** Design-system prop forwarded to the DOM (usually empty in this capture). */
    tag?: string;
  }
}
