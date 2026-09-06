/**
 * The hero URL form.
 *
 * The validation and the NSFW/adult blocklist are ported verbatim from the live
 * site, so a visitor typing a bad or blocked URL sees exactly the same two
 * alerts. What is deliberately NOT ported is the final
 * `window.location.href = 'https://start.coframe.com/?url=...'` redirect: a
 * replica must not navigate the visitor onto the real product, nor forward
 * their query params (gclid, utm_ tags, fbclid) into somebody else's attribution
 * pipeline. On the success path the submission is logged locally instead, and
 * the URL that *would* have been opened is reported for inspection.
 */
import { type Teardown } from './runtime';

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
    if (domain.endsWith(`.${blocked}`)) return true;
  }
  const stem = domain.replace(/\.[a-z]{2,10}$/, '');
  for (const kw of BLOCKED_KEYWORDS) {
    if (stem.includes(kw)) return true;
  }
  return false;
}

function validateURL(url: string): boolean {
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
  const scope: ParentNode = root ?? document;
  const form = scope.querySelector<HTMLElement>('.hero__form');
  if (!form) return;

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

    // Live site would redirect to start.coframe.com here. Intentionally local.
    console.info(
      '[replica] hero form intercepted locally (not submitted). ' +
        `Live site would have opened: https://start.coframe.com/?url=${encodeURIComponent(url)}`,
    );
  };

  form.addEventListener('submit', onSubmit);

  // The CTA is not a real submit button, so the site wires it up manually.
  const cta = form.querySelector<HTMLElement>('.cta');
  const onCtaClick = (event: Event) => {
    event.preventDefault();
    form.dispatchEvent(new Event('submit'));
  };
  cta?.addEventListener('click', onCtaClick);

  return () => {
    form.removeEventListener('submit', onSubmit);
    cta?.removeEventListener('click', onCtaClick);
  };
}
