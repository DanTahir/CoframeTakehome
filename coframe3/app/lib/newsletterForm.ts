/**
 * Footer newsletter form.
 *
 * Faithful port: the CTA button and the Enter key both validate the address
 * client-side before letting the form submit, and alert on a bad address.
 */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

export function initNewsletterForm(): () => void {
  const form = document.querySelector<HTMLFormElement>('.footer .newsletter-form__form');
  if (!form) return () => {};

  const input = form.querySelector<HTMLInputElement>('.newsletter-form__text-field');
  const button = form.querySelector<HTMLElement>('.newsletter-form__button');
  if (!input || !button) return () => {};

  const submitIfValid = () => {
    const email = input.value.trim();
    if (isValidEmail(email)) form.requestSubmit();
    else window.alert('Please enter a valid email address.');
  };

  const onClick = (event: Event) => {
    event.preventDefault();
    submitIfValid();
  };

  const onKeyPress = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const target = event.target as HTMLElement | null;
    if (target?.tagName.toLowerCase() === 'input') submitIfValid();
  };

  button.addEventListener('click', onClick);
  form.addEventListener('keypress', onKeyPress);

  return () => {
    button.removeEventListener('click', onClick);
    form.removeEventListener('keypress', onKeyPress);
  };
}
