// Footer newsletter form.
// Ported from the page's inline newsletter script: the CTA button and Enter both
// validate the email client-side before letting the form submit.

export function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

export interface NewsletterHooks {
  onAlert?: (message: string) => void;
}

export function initNewsletterForm(
  root: ParentNode = document,
  hooks: NewsletterHooks = {},
): () => void {
  const form = root.querySelector('.footer .newsletter-form__form');
  if (!form) return () => {};

  const inputField = form.querySelector('.newsletter-form__text-field');
  const submitButton = form.querySelector('.newsletter-form__button');
  const alertFn = hooks.onAlert ?? ((message: string) => window.alert(message));

  const currentEmail = () =>
    inputField instanceof HTMLInputElement ? inputField.value.trim() : '';

  const trySubmit = () => {
    const email = currentEmail();
    if (isValidEmail(email)) {
      // requestSubmit is absent in jsdom; fall back to a submit event.
      if (form instanceof HTMLFormElement && typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    } else {
      alertFn('Please enter a valid email address.');
    }
  };

  const onButtonClick = (event: Event) => {
    event.preventDefault();
    trySubmit();
  };

  const onKeyPress = (event: Event) => {
    const e = event as KeyboardEvent;
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const target = e.target;
    if (target instanceof HTMLElement && target.tagName.toLowerCase() === 'input') {
      trySubmit();
    }
  };

  submitButton?.addEventListener('click', onButtonClick);
  form.addEventListener('keypress', onKeyPress);

  return () => {
    submitButton?.removeEventListener('click', onButtonClick);
    form.removeEventListener('keypress', onKeyPress);
  };
}
