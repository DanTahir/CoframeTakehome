/**
 * Form handling specific to coframe.com replica.
 *
 * Ports the captured script script-19.js:
 *   - Hero form submission with URL validation
 *   - NSFW/adult content blocklist
 *   - Validation error alerts
 *
 * CRITICAL: This module intercepts form submission and prevents any POST
 * to the original endpoint or navigation to external signup hosts.
 * Form validation state is toggled locally only.
 */
import { type Teardown } from './runtime';

// ──── NSFW / adult blocklist ──────────────────────────────────────────────
// Mirror of small-fish blocklist (frontend + backend). Update all
// three together so a domain blocked in one is blocked everywhere.
const BLOCKED_DOMAINS = new Set([
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'xhamster.com',
  'redtube.com',
  'youporn.com',
  'tube8.com',
  'spankbang.com',
  'eporner.com',
  'pornone.com',
  'tnaflix.com',
  'drtuber.com',
  'hclips.com',
  'txxx.com',
  'porntrex.com',
  'fuq.com',
  'beeg.com',
  'nuvid.com',
  'porn.com',
  'thumbzilla.com',
  'pornpics.com',
  'sex.com',
  'chaturbate.com',
  'stripchat.com',
  'bongacams.com',
  'livejasmin.com',
  'cam4.com',
  'myfreecams.com',
  'camsoda.com',
  'flirt4free.com',
  'onlyfans.com',
  'fansly.com',
  'manyvids.com',
  'brazzers.com',
  'realitykings.com',
  'bangbros.com',
  'naughtyamerica.com',
  'mofos.com',
  'digitalplayground.com',
  'wicked.com',
  'fakehub.com',
  'teamskeet.com',
  'babes.com',
  'twistys.com',
  'penthouse.com',
  'playboy.com',
  'hustler.com',
  'adultfriendfinder.com',
  'ashleymadison.com',
  'fetlife.com',
  'literotica.com',
  'hentaihaven.xxx',
  'hanime.tv',
  'nhentai.net',
  'rule34.xxx',
  'e621.net',
  'gelbooru.com',
  'danbooru.donmai.us',
  'motherless.com',
  'heavy-r.com',
  'efukt.com',
  'bestgore.com',
  'theync.com',
  'crazyshit.com',
  'kaotic.com',
  'leaked.com',
  'fapello.com',
  'coomer.su',
  'simpcity.su',
]);

const BLOCKED_KEYWORDS = [
  'porn',
  'xxx',
  'nsfw',
  'hentai',
  'erotic',
  'camgirl',
  'livecam',
  'sexcam',
  'adultvideo',
  'fapfap',
  'bigtits',
  'nudes',
  'escort',
  'cumshot',
  'blowjob',
  'milfs',
  'fetish',
];

function isBlockedDomain(input: string): boolean {
  const domain = (input || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim();

  if (!domain) return false;
  if (BLOCKED_DOMAINS.has(domain)) return true;

  for (const blocked of BLOCKED_DOMAINS) {
    if (domain.endsWith('.' + blocked)) return true;
  }

  const stem = domain.replace(/\.[a-z]{2,10}$/, '');
  for (const kw of BLOCKED_KEYWORDS) {
    if (stem.includes(kw)) return true;
  }

  return false;
}

function validateURL(url: string): boolean {
  const pattern = new RegExp(
    '^(https?:\\\/\\\/)?' +
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z\\d]{2,})' +
      '(\\:\\d+)?(\\\/[-a-z\\d%_.~+]*)*' +
      '(\\?[;&a-z\\d%_.~+=-]*)?' +
      '(\\#[-a-z\\d_]*)?$',
    'i',
  );
  return !!pattern.test(url);
}

export function initCoframeForms(root: ParentNode = document): Teardown | void {
  const form = root.querySelector<HTMLFormElement>('.hero__form');
  if (!form) return;

  const listeners: Array<{ el: HTMLElement; event: string; handler: EventListener }> = [];

  // ──── Form submit handler ─────────────────────────────────────────────────
  const onSubmit = (event: Event): void => {
    event.preventDefault();

    const inputElement = form.querySelector<HTMLInputElement>('.hero__text-field');
    if (!inputElement) return;

    const url = inputElement.value;

    if (!validateURL(url)) {
      alert('Oops, try entering a valid URL!');
      return;
    }

    // NSFW block — happens BEFORE the redirect so porn/leak/cam URLs
    // never reach start.coframe.com. Same friendly message the
    // small-fish frontend uses for consistency.
    if (isBlockedDomain(url)) {
      alert('This site cannot be analyzed. Please enter a business website.');
      return;
    }

    // CRITICAL: Intercepted locally. Do NOT redirect to start.coframe.com.
    // In a real implementation, this would be where the form submission happens.
    // Instead, we log locally and show success state.
    console.info('[replica] hero form intercepted locally (not submitted):', { url });

    // Show success state if there's a success element
    const parent = form.parentElement;
    const success = parent?.querySelector<HTMLElement>('.w-form-done') ??
      parent?.querySelector<HTMLElement>('[data-form-success]') ??
      parent?.querySelector<HTMLElement>('.form-success') ??
      form.querySelector<HTMLElement>('.w-form-done') ??
      form.querySelector<HTMLElement>('[data-form-success]') ??
      form.querySelector<HTMLElement>('.form-success') ??
      null;

    if (success) {
      form.style.display = 'none';
      success.style.display = 'block';
    }
  };

  form.addEventListener('submit', onSubmit);
  listeners.push({ el: form, event: 'submit', handler: onSubmit });

  // ──── CTA button click handler ────────────────────────────────────────────
  const ctaButton = form.querySelector<HTMLElement>('.cta');
  if (ctaButton) {
    const onCtaClick = (event: Event): void => {
      event.preventDefault();
      form.dispatchEvent(new Event('submit'));
    };
    ctaButton.addEventListener('click', onCtaClick);
    listeners.push({ el: ctaButton, event: 'click', handler: onCtaClick });
  }

  // ──── Teardown ────────────────────────────────────────────────────────────
  return () => {
    listeners.forEach(({ el, event, handler }) => {
      el.removeEventListener(event, handler);
    });
  };
}
