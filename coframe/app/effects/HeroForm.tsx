'use client';

import { useEffect } from 'react';

/**
 * Hero "analyze your website" form. The live site ships this behaviour as a
 * commented-out embed inside the hero (see scrape/sections/hero.html): validate
 * the typed URL and hand off to start.coframe.com with it encoded.
 */
export const URL_PATTERN = new RegExp(
  '^(https?:\\/\\/)?' + // optional protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z\\d]{2,})' + // domain + TLD
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // optional port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // optional query
    '(\\#[-a-z\\d_]*)?$', // optional fragment
  'i',
);

export function validateURL(url: string): boolean {
  return URL_PATTERN.test(url.trim());
}

export function analyzeUrlFor(url: string): string {
  return `https://start.coframe.com/?url=${encodeURIComponent(url.trim())}`;
}

export function initHeroForm(root: ParentNode = document): () => void {
  const form = root.querySelector<HTMLFormElement>('.hero__form');
  if (!form) return () => {};

  const input = form.querySelector<HTMLInputElement>('.hero__text-field');
  const cta = form.querySelector<HTMLAnchorElement>('.cta');

  const onSubmit = (event: Event) => {
    event.preventDefault();
    const url = input?.value ?? '';
    if (validateURL(url)) {
      window.location.href = analyzeUrlFor(url);
    } else {
      window.alert('Oops, try entering a valid URL!');
    }
  };

  const onCtaClick = (event: MouseEvent) => {
    event.preventDefault();
    form.dispatchEvent(new Event('submit', { cancelable: true }));
  };

  form.addEventListener('submit', onSubmit);
  cta?.addEventListener('click', onCtaClick);

  return () => {
    form.removeEventListener('submit', onSubmit);
    cta?.removeEventListener('click', onCtaClick);
  };
}

export default function HeroForm() {
  useEffect(() => initHeroForm(), []);
  return null;
}
