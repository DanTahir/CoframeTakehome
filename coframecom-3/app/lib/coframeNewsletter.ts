/**
 * Footer newsletter form — a faithful port of the captured inline script
 * `scrape/analysis/script-20.js`.
 *
 * This module exists because the newsletter form cannot be driven by the
 * template's generic `createForms` alone. Verified against the live DOM:
 *
 *   .newsletter-form__button  ->  <a href="#">   (NOT a submit button)
 *   .newsletter-form__form    ->  method="post", no action, no submit control
 *
 * A generic form effect binds the `submit` event, but an `<a href="#">` never
 * fires one — so clicking it would fall through to the browser default and
 * jump the page to the top while sending nothing. `initSmoothAnchors` does not
 * cover it either: its selector is `a[href^="#"]:not([href="#"])`, which
 * deliberately excludes the bare `#`.
 *
 * Upstream solved this with an explicit click handler that calls
 * `preventDefault()`, validates the address, and then calls
 * `form.requestSubmit()`. That is reproduced here verbatim, including the
 * `alert()` on an invalid address and the Enter-key path.
 *
 * Division of responsibility (deliberate, do not collapse these):
 *   - THIS module owns validation and *triggering* submission.
 *   - The generic `createForms({ formSelector: '.newsletter-form__form' })`
 *     effect owns *intercepting* the resulting submit event, so nothing is
 *     ever POSTed anywhere and the site's own `.w-form-done` block is shown.
 *
 * `requestSubmit()` dispatches a cancelable `submit` event (unlike
 * `form.submit()`, which bypasses handlers and would navigate), which is
 * exactly what lets the interception layer above catch it.
 */
import { type EffectInit, type Teardown } from './runtime';

/** Upstream's `isValidEmail`, verbatim. */
function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

export const initCoframeNewsletter: EffectInit = (
  root: ParentNode = document,
): Teardown | void => {
  // Upstream scoped this to `.footer .newsletter-form__form`; fall back to the
  // unscoped selector so the effect still binds if the footer wrapper differs.
  const form =
    root.querySelector<HTMLFormElement>('.footer .newsletter-form__form') ??
    root.querySelector<HTMLFormElement>('.newsletter-form__form');
  if (!form) return;

  const inputField = form.querySelector<HTMLInputElement>('.newsletter-form__text-field');
  const submitButton = form.querySelector<HTMLElement>('.newsletter-form__button');
  if (!inputField || !submitButton) return;

  const trySubmit = () => {
    const email = inputField.value.trim();
    if (isValidEmail(email)) {
      // Dispatches a cancelable submit event, which the interception layer
      // (generic createForms) catches and preventDefaults.
      form.requestSubmit();
    } else {
      // Upstream behaviour, kept as-is.
      window.alert('Please enter a valid email address.');
    }
  };

  const onClick = (event: Event) => {
    // Critical: without this the bare href="#" scrolls the page to the top.
    event.preventDefault();
    trySubmit();
  };

  const onKeypress = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const target = event.target as HTMLElement | null;
    if (target?.tagName.toLowerCase() === 'input') trySubmit();
  };

  submitButton.addEventListener('click', onClick);
  form.addEventListener('keypress', onKeypress);

  return () => {
    submitButton.removeEventListener('click', onClick);
    form.removeEventListener('keypress', onKeypress);
  };
};
