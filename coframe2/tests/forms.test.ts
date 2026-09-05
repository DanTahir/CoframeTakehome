// Hero URL form + footer newsletter form.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BLOCKED_DOMAINS,
  BLOCKED_KEYWORDS,
  START_URL,
  buildStartUrl,
  initHeroForm,
  isBlockedDomain,
  validateURL,
} from '../app/lib/heroForm';
import { initNewsletterForm, isValidEmail } from '../app/lib/newsletterForm';
import { mountBody, unmountBody } from './helpers';

describe('hero form URL validation', () => {
  it('accepts the URL shapes a visitor would realistically paste', () => {
    for (const url of [
      'coframe.com',
      'www.coframe.com',
      'https://coframe.com',
      'http://coframe.com',
      'https://www.coframe.com/pricing',
      'https://shop.example.co.uk/products?id=3',
      'example.com:8080/path',
      'https://example.com/#anchor',
    ]) {
      expect(validateURL(url), url).toBe(true);
    }
  });

  it('rejects non-URL input', () => {
    for (const bad of ['', 'not a url', 'hello world', 'ftp:/', '@@@', 'http://']) {
      expect(validateURL(bad), bad).toBe(false);
    }
  });
});

describe('hero form NSFW screening', () => {
  it('blocks an exact blocklisted domain', () => {
    expect(isBlockedDomain('pornhub.com')).toBe(true);
    expect(isBlockedDomain('onlyfans.com')).toBe(true);
  });

  it('normalises scheme, www prefix, path and casing before matching', () => {
    for (const variant of [
      'https://pornhub.com',
      'http://www.pornhub.com',
      'PORNHUB.COM',
      'https://www.PornHub.com/some/path?x=1',
      '  pornhub.com  ',
    ]) {
      expect(isBlockedDomain(variant), variant).toBe(true);
    }
  });

  it('blocks subdomains of a blocklisted domain', () => {
    expect(isBlockedDomain('cdn.pornhub.com')).toBe(true);
    expect(isBlockedDomain('a.b.onlyfans.com')).toBe(true);
  });

  it('blocks by keyword in the domain stem', () => {
    expect(isBlockedDomain('freepornsite.com')).toBe(true);
    expect(isBlockedDomain('myhentaiblog.net')).toBe(true);
    expect(isBlockedDomain('bestescort.io')).toBe(true);
  });

  it('allows ordinary business sites', () => {
    for (const ok of [
      'coframe.com',
      'stripe.com',
      'openai.com',
      'my-startup.io',
      'shop.example.co.uk',
    ]) {
      expect(isBlockedDomain(ok), ok).toBe(false);
    }
  });

  it('treats empty input as not blocked (validation catches it first)', () => {
    expect(isBlockedDomain('')).toBe(false);
    expect(isBlockedDomain(null)).toBe(false);
    expect(isBlockedDomain(undefined)).toBe(false);
  });

  it('carries the full blocklist from the original script', () => {
    expect(BLOCKED_DOMAINS.size).toBeGreaterThan(60);
    expect(BLOCKED_KEYWORDS.length).toBeGreaterThan(15);
  });
});

describe('hero form redirect construction', () => {
  it('sends the URL to start.coframe.com as a query param', () => {
    const out = buildStartUrl('coframe.com', '');
    expect(out.startsWith(START_URL)).toBe(true);
    expect(new URL(out).searchParams.get('url')).toBe('coframe.com');
  });

  it('forwards inbound attribution params', () => {
    const out = buildStartUrl('coframe.com', '?gclid=abc123&utm_source=google&utm_medium=cpc');
    const params = new URL(out).searchParams;
    expect(params.get('url')).toBe('coframe.com');
    expect(params.get('gclid')).toBe('abc123');
    expect(params.get('utm_source')).toBe('google');
    expect(params.get('utm_medium')).toBe('cpc');
  });

  it('never lets an inbound url param clobber the submitted URL', () => {
    const out = buildStartUrl('coframe.com', '?url=evil.example');
    expect(new URL(out).searchParams.getAll('url')).toEqual(['coframe.com']);
  });

  it('encodes URLs safely', () => {
    const out = buildStartUrl('https://example.com/a b?x=1&y=2', '');
    expect(new URL(out).searchParams.get('url')).toBe('https://example.com/a b?x=1&y=2');
  });
});

describe('hero form on the real markup', () => {
  beforeEach(() => mountBody());
  afterEach(() => unmountBody());

  function submit(value: string) {
    const onAlert = vi.fn();
    const onNavigate = vi.fn();
    const cleanup = initHeroForm(document, { onAlert, onNavigate });

    const input = document.querySelector('.hero__text-field') as HTMLInputElement;
    input.value = value;
    document.querySelector('.hero__form')!.dispatchEvent(
      new Event('submit', { cancelable: true }),
    );

    cleanup();
    return { onAlert, onNavigate };
  }

  it('finds the hero form and its input in the ported markup', () => {
    expect(document.querySelector('.hero__form')).not.toBeNull();
    expect(document.querySelector('.hero__text-field')).toBeInstanceOf(HTMLInputElement);
  });

  it('redirects a valid business URL', () => {
    const { onAlert, onNavigate } = submit('coframe.com');
    expect(onAlert).not.toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate.mock.calls[0][0]).toContain('start.coframe.com');
  });

  it('alerts and does not redirect on an invalid URL', () => {
    const { onAlert, onNavigate } = submit('definitely not a url');
    expect(onAlert).toHaveBeenCalledWith('Oops, try entering a valid URL!');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('alerts and does not redirect on a blocked domain', () => {
    const { onAlert, onNavigate } = submit('pornhub.com');
    expect(onAlert).toHaveBeenCalledWith(
      'This site cannot be analyzed. Please enter a business website.',
    );
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('detaches its listener on cleanup', () => {
    const onNavigate = vi.fn();
    const cleanup = initHeroForm(document, { onNavigate, onAlert: () => {} });
    cleanup();

    const input = document.querySelector('.hero__text-field') as HTMLInputElement;
    input.value = 'coframe.com';
    document.querySelector('.hero__form')!.dispatchEvent(new Event('submit'));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('is a no-op when the form is absent', () => {
    const empty = document.createElement('div');
    expect(() => initHeroForm(empty)()).not.toThrow();
  });
});

describe('newsletter email validation', () => {
  it('accepts normal addresses', () => {
    for (const ok of ['a@b.co', 'someone@example.com', 'first.last+tag@sub.example.org']) {
      expect(isValidEmail(ok), ok).toBe(true);
    }
  });

  it('rejects malformed addresses', () => {
    for (const bad of ['', 'plain', 'no@tld', 'a b@example.com', '@example.com', 'a@', 'a@b']) {
      expect(isValidEmail(bad), bad).toBe(false);
    }
  });
});

describe('newsletter form on the real markup', () => {
  beforeEach(() => mountBody());
  afterEach(() => unmountBody());

  it('finds the footer newsletter form in the ported markup', () => {
    expect(document.querySelector('.footer .newsletter-form__form')).not.toBeNull();
    expect(document.querySelector('.newsletter-form__text-field')).not.toBeNull();
    expect(document.querySelector('.newsletter-form__button')).not.toBeNull();
  });

  it('alerts on an invalid email when the button is clicked', () => {
    const onAlert = vi.fn();
    const cleanup = initNewsletterForm(document, { onAlert });

    const input = document.querySelector('.newsletter-form__text-field') as HTMLInputElement;
    input.value = 'nope';
    (document.querySelector('.newsletter-form__button') as HTMLElement).click();

    expect(onAlert).toHaveBeenCalledWith('Please enter a valid email address.');
    cleanup();
  });

  it('submits a valid email instead of alerting', () => {
    const onAlert = vi.fn();
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    const form = document.querySelector('.footer .newsletter-form__form') as HTMLElement;
    form.addEventListener('submit', onSubmit);

    const cleanup = initNewsletterForm(document, { onAlert });
    const input = document.querySelector('.newsletter-form__text-field') as HTMLInputElement;
    input.value = 'someone@example.com';
    (document.querySelector('.newsletter-form__button') as HTMLElement).click();

    expect(onAlert).not.toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledTimes(1);

    cleanup();
    form.removeEventListener('submit', onSubmit);
  });

  it('trims surrounding whitespace before validating', () => {
    const onAlert = vi.fn();
    const cleanup = initNewsletterForm(document, { onAlert });

    const input = document.querySelector('.newsletter-form__text-field') as HTMLInputElement;
    input.value = '   someone@example.com   ';
    (document.querySelector('.newsletter-form__button') as HTMLElement).click();

    expect(onAlert).not.toHaveBeenCalled();
    cleanup();
  });

  it('validates on Enter in the input', () => {
    const onAlert = vi.fn();
    const cleanup = initNewsletterForm(document, { onAlert });

    const input = document.querySelector('.newsletter-form__text-field') as HTMLInputElement;
    input.value = 'bad';
    input.dispatchEvent(
      new KeyboardEvent('keypress', { key: 'Enter', bubbles: true, cancelable: true }),
    );

    expect(onAlert).toHaveBeenCalledWith('Please enter a valid email address.');
    cleanup();
  });

  it('ignores non-Enter keys', () => {
    const onAlert = vi.fn();
    const cleanup = initNewsletterForm(document, { onAlert });

    const input = document.querySelector('.newsletter-form__text-field') as HTMLInputElement;
    input.value = 'bad';
    input.dispatchEvent(new KeyboardEvent('keypress', { key: 'a', bubbles: true }));

    expect(onAlert).not.toHaveBeenCalled();
    cleanup();
  });

  it('is a no-op when the form is absent', () => {
    const empty = document.createElement('div');
    expect(() => initNewsletterForm(empty)()).not.toThrow();
  });
});
