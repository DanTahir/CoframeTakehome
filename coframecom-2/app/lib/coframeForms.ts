/**
 * The page's two forms, ported from `scrape/analysis/script-19.js` (hero URL
 * form) and `script-20.js` (footer newsletter).
 *
 * Both are intercepted locally. Upstream, the hero form redirects the visitor
 * to `start.coframe.com` with their URL plus every ad-attribution query
 * parameter, and the newsletter form POSTs to Webflow. A replica must do
 * neither: sending real leads and real email addresses to the original site's
 * funnel is a genuine harm, not a cosmetic difference. Validation, the
 * blocklist and the alert copy are preserved exactly, so the interaction
 * behaves identically right up to the side effect.
 */
import type { Teardown } from './runtime';

/* --------------------------------------------------------------- hero form */

/** Adult/NSFW blocklist, mirrored verbatim from upstream. */
const BLOCKED_DOMAINS = new Set([
  'pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com', 'redtube.com',
  'youporn.com', 'tube8.com', 'spankbang.com', 'eporner.com', 'pornone.com',
  'tnaflix.com', 'drtuber.com', 'hclips.com', 'txxx.com', 'porntrex.com',
  'fuq.com', 'beeg.com', 'nuvid.com', 'porn.com', 'thumbzilla.com',
  'pornpics.com', 'sex.com',
  'chaturbate.com', 'stripchat.com', 'bongacams.com', 'livejasmin.com',
  'cam4.com', 'myfreecams.com', 'camsoda.com', 'flirt4free.com',
  'onlyfans.com', 'fansly.com', 'manyvids.com',
  'brazzers.com', 'realitykings.com', 'bangbros.com', 'naughtyamerica.com',
  'mofos.com', 'digitalplayground.com', 'wicked.com', 'fakehub.com',
  'teamskeet.com', 'babes.com', 'twistys.com', 'penthouse.com',
  'playboy.com', 'hustler.com',
  'adultfriendfinder.com', 'ashleymadison.com', 'fetlife.com',
  'literotica.com', 'hentaihaven.xxx', 'hanime.tv', 'nhentai.net',
  'rule34.xxx', 'e621.net', 'gelbooru.com', 'danbooru.donmai.us',
  'motherless.com', 'heavy-r.com', 'efukt.com', 'bestgore.com',
  'theync.com', 'crazyshit.com', 'kaotic.com',
  'leaked.com', 'fapello.com', 'coomer.su', 'simpcity.su',
]);

const BLOCKED_KEYWORDS = [
  'porn', 'xxx', 'nsfw', 'hentai', 'erotic', 'camgirl', 'livecam', 'sexcam',
  'adultvideo', 'fapfap', 'bigtits', 'nudes', 'escort', 'cumshot', 'blowjob',
  'milfs', 'fetish',
];

export function isBlockedDomain(input: string): boolean {
  const domain = (input || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim();

  if (!domain) return false;
  if (BLOCKED_DOMAINS.has(domain)) return true;
  for (const blocked of BLOCKED_DOMAINS) {
    if (domain.endsWith(`.${blocked}`)) return true;
  }
  const stem = domain.replace(/\.[a-z]{2,10}$/, '');
  for (const kw of BLOCKED_KEYWORDS) {
    if (stem.includes(kw)) return true;
  }
  return false;
}

/** Upstream's URL pattern, verbatim. */
export function validateURL(url: string): boolean {
  const pattern = new RegExp(
    '^(https?:\\/\\/)?' +
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z\\d]{2,})' +
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
      '(\\?[;&a-z\\d%_.~+=-]*)?' +
      '(\\#[-a-z\\d_]*)?$',
    'i',
  );
  return pattern.test(url);
}

export function initCoframeHeroForm(root: ParentNode = document): Teardown | void {
  const form = root.querySelector<HTMLFormElement>('.hero__form');
  if (!form) return;

  const cta = form.querySelector<HTMLElement>('.cta');

  const onSubmit = (event: Event) => {
    event.preventDefault();

    const inputElement = form.querySelector<HTMLInputElement>('.hero__text-field');
    const url = inputElement?.value ?? '';

    if (!validateURL(url)) {
      window.alert('Oops, try entering a valid URL!');
      return;
    }

    if (isBlockedDomain(url)) {
      window.alert('This site cannot be analyzed. Please enter a business website.');
      return;
    }

    // Upstream navigates to start.coframe.com here. Intercepted on purpose.
    console.info('[replica] hero form intercepted locally (no redirect):', url);
  };

  const onCtaClick = (event: Event) => {
    event.preventDefault();
    form.dispatchEvent(new Event('submit'));
  };

  form.addEventListener('submit', onSubmit);
  cta?.addEventListener('click', onCtaClick);

  return () => {
    form.removeEventListener('submit', onSubmit);
    cta?.removeEventListener('click', onCtaClick);
  };
}

/* --------------------------------------------------------- newsletter form */

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function initCoframeNewsletterForm(root: ParentNode = document): Teardown | void {
  const form = root.querySelector<HTMLFormElement>('.footer .newsletter-form__form');
  if (!form) return;

  const inputField = form.querySelector<HTMLInputElement>('.newsletter-form__text-field');
  const submitButton = form.querySelector<HTMLElement>('.newsletter-form__button');

  // Webflow's success/error blocks are siblings of the form inside `.w-form`.
  const wrapper = form.parentElement;
  const done = wrapper?.querySelector<HTMLElement>('.w-form-done') ?? null;
  const fail = wrapper?.querySelector<HTMLElement>('.w-form-fail') ?? null;

  const succeedLocally = () => {
    // Same visible outcome as a successful Webflow POST, with no network call.
    form.style.display = 'none';
    if (done) done.style.display = 'block';
    if (fail) fail.style.display = 'none';
    console.info('[replica] newsletter signup intercepted locally (not submitted)');
  };

  const attempt = () => {
    const email = inputField?.value.trim() ?? '';
    if (isValidEmail(email)) succeedLocally();
    else window.alert('Please enter a valid email address.');
  };

  const onButtonClick = (event: Event) => {
    event.preventDefault();
    attempt();
  };

  const onKeypress = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const target = event.target as HTMLElement | null;
    if (target?.tagName.toLowerCase() === 'input') attempt();
  };

  // Belt and braces: even a synthesised submit must never reach the network.
  const onSubmit = (event: Event) => {
    event.preventDefault();
    attempt();
  };

  submitButton?.addEventListener('click', onButtonClick);
  form.addEventListener('keypress', onKeypress);
  form.addEventListener('submit', onSubmit);

  return () => {
    submitButton?.removeEventListener('click', onButtonClick);
    form.removeEventListener('keypress', onKeypress);
    form.removeEventListener('submit', onSubmit);
  };
}
