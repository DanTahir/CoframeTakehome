import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeUrlFor, initHeroForm, validateURL } from '@/app/effects/HeroForm';

describe('validateURL', () => {
  it.each([
    'coframe.com',
    'www.coframe.com',
    'https://coframe.com',
    'http://coframe.com',
    'https://www.coframe.com/pricing',
    'https://coframe.com:8080/path',
    'https://coframe.com/path?query=1',
    'https://sub.domain.coframe.co.uk',
  ])('accepts %s', (url) => {
    expect(validateURL(url)).toBe(true);
  });

  it.each(['', '   ', 'not a url', 'http://', '@@@'])(
    'rejects %s',
    (url) => {
      expect(validateURL(url)).toBe(false);
    },
  );

  // The live site's regex (scrape/index.html) makes the dot optional in
  // `((([a-z\d]([a-z\d-]*[a-z\d])*)\.?)+[a-z\d]{2,})`, so a bare word is
  // accepted as a hostname. Ported verbatim, quirk included.
  it('accepts a bare hostname, matching the original regex', () => {
    expect(validateURL('coframe')).toBe(true);
    expect(validateURL('localhost')).toBe(true);
  });

  it('tolerates surrounding whitespace', () => {
    expect(validateURL('  coframe.com  ')).toBe(true);
  });
});

describe('analyzeUrlFor', () => {
  it('hands off to start.coframe.com with the url encoded', () => {
    expect(analyzeUrlFor('https://example.com/a b')).toBe(
      'https://start.coframe.com/?url=https%3A%2F%2Fexample.com%2Fa%20b',
    );
  });

  it('trims before encoding', () => {
    expect(analyzeUrlFor('  example.com  ')).toBe(
      'https://start.coframe.com/?url=example.com',
    );
  });
});

describe('initHeroForm', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form class="hero__form">
        <input class="hero__text-field" type="text" />
        <a class="cta" href="#">Analyze</a>
      </form>
    `;
  });

  it('is a no-op when the form is absent', () => {
    document.body.innerHTML = '<div></div>';
    expect(() => initHeroForm()).not.toThrow();
  });

  it('navigates to the analyze URL for a valid input', () => {
    const cleanup = initHeroForm();
    const input = document.querySelector<HTMLInputElement>('.hero__text-field')!;
    input.value = 'example.com';

    // jsdom refuses real navigation, so intercept the assignment.
    const hrefSetter = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        set href(value: string) {
          hrefSetter(value);
        },
        get href() {
          return 'http://localhost/';
        },
      },
    });

    document
      .querySelector<HTMLFormElement>('.hero__form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));

    expect(hrefSetter).toHaveBeenCalledWith(
      'https://start.coframe.com/?url=example.com',
    );
    cleanup();
  });

  it('alerts instead of navigating for an invalid input', () => {
    const cleanup = initHeroForm();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const input = document.querySelector<HTMLInputElement>('.hero__text-field')!;
    input.value = 'nope nope';

    document
      .querySelector<HTMLFormElement>('.hero__form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));

    expect(alertSpy).toHaveBeenCalledWith('Oops, try entering a valid URL!');
    alertSpy.mockRestore();
    cleanup();
  });

  it('detaches its listeners on cleanup', () => {
    const cleanup = initHeroForm();
    cleanup();

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    document
      .querySelector<HTMLFormElement>('.hero__form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));

    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
