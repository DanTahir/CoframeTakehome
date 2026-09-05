import { describe, expect, it, vi } from 'vitest';
import { initNewsletterForm, isValidEmail } from '../app/lib/newsletterForm';

function renderFooterForm(): HTMLFormElement {
  document.body.innerHTML = `
    <section class="footer">
      <form class="newsletter-form__form">
        <input class="newsletter-form__text-field" type="email" />
        <div class="newsletter-form__button"></div>
      </form>
    </section>
  `;
  const form = document.querySelector<HTMLFormElement>('.newsletter-form__form')!;
  // jsdom does not implement requestSubmit.
  form.requestSubmit = vi.fn();
  return form;
}

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    for (const email of ['a@b.co', 'first.last@example.com', 'x+tag@sub.domain.io']) {
      expect(isValidEmail(email), email).toBe(true);
    }
  });

  it('rejects malformed addresses', () => {
    for (const email of ['', 'nope', 'a@b', 'a b@c.com', '@example.com', 'a@@b.com']) {
      expect(isValidEmail(email), email).toBe(false);
    }
  });
});

describe('initNewsletterForm', () => {
  it('submits a valid address when the button is clicked', () => {
    const form = renderFooterForm();
    initNewsletterForm();

    document.querySelector<HTMLInputElement>('.newsletter-form__text-field')!.value =
      'reader@example.com';
    document.querySelector<HTMLElement>('.newsletter-form__button')!.click();

    expect(form.requestSubmit).toHaveBeenCalledOnce();
  });

  it('trims surrounding whitespace before validating', () => {
    const form = renderFooterForm();
    initNewsletterForm();

    document.querySelector<HTMLInputElement>('.newsletter-form__text-field')!.value =
      '  reader@example.com  ';
    document.querySelector<HTMLElement>('.newsletter-form__button')!.click();

    expect(form.requestSubmit).toHaveBeenCalledOnce();
  });

  it('alerts and does not submit an invalid address', () => {
    const form = renderFooterForm();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    initNewsletterForm();

    document.querySelector<HTMLInputElement>('.newsletter-form__text-field')!.value = 'nope';
    document.querySelector<HTMLElement>('.newsletter-form__button')!.click();

    expect(alertSpy).toHaveBeenCalledWith('Please enter a valid email address.');
    expect(form.requestSubmit).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('submits on Enter from the input', () => {
    const form = renderFooterForm();
    initNewsletterForm();

    const input = document.querySelector<HTMLInputElement>('.newsletter-form__text-field')!;
    input.value = 'reader@example.com';
    input.dispatchEvent(
      new KeyboardEvent('keypress', { key: 'Enter', bubbles: true, cancelable: true }),
    );

    expect(form.requestSubmit).toHaveBeenCalledOnce();
  });

  it('ignores other keys', () => {
    const form = renderFooterForm();
    initNewsletterForm();

    const input = document.querySelector<HTMLInputElement>('.newsletter-form__text-field')!;
    input.value = 'reader@example.com';
    input.dispatchEvent(new KeyboardEvent('keypress', { key: 'a', bubbles: true }));

    expect(form.requestSubmit).not.toHaveBeenCalled();
  });

  it('stops responding after teardown', () => {
    const form = renderFooterForm();
    const teardown = initNewsletterForm();
    teardown();

    document.querySelector<HTMLInputElement>('.newsletter-form__text-field')!.value =
      'reader@example.com';
    document.querySelector<HTMLElement>('.newsletter-form__button')!.click();

    expect(form.requestSubmit).not.toHaveBeenCalled();
  });
});
