// Hero URL form.
//
// The live page ships two submit handlers on .hero__form: an older one that just
// redirects to start.coframe.com?url=<encoded>, and a newer one that additionally
// screens the URL against an NSFW blocklist and forwards every inbound query
// param for ad attribution. Both fire on the live site (the older one wins the
// race and redirects first, making the blocklist dead code in practice) - that's a
// bug in the original, so the replica implements the newer, intended behaviour as
// the single handler.

export const BLOCKED_DOMAINS = new Set([
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

export const BLOCKED_KEYWORDS = [
  'porn', 'xxx', 'nsfw', 'hentai', 'erotic', 'camgirl', 'livecam', 'sexcam',
  'adultvideo', 'fapfap', 'bigtits', 'nudes', 'escort', 'cumshot', 'blowjob',
  'milfs', 'fetish',
];

export const START_URL = 'https://start.coframe.com/';

export function isBlockedDomain(input: string | null | undefined): boolean {
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

export function validateURL(url: string): boolean {
  const pattern = new RegExp(
    '^(https?:\\/\\/)?' +
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z\\d]{2,})' +
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
      '(\\?[;&a-z\\d%_.~+=-]*)?' +
      '(\\#[-a-z\\d_]*)?$',
    'i',
  );
  return !!pattern.test(url);
}

/**
 * Builds the start.coframe.com redirect, forwarding every inbound query param
 * (gclid, utm_*, fbclid, ...) so attribution survives the hop.
 */
export function buildStartUrl(url: string, search: string): string {
  const target = new URL(START_URL);
  target.searchParams.set('url', url);
  new URLSearchParams(search).forEach((value, key) => {
    if (key !== 'url') target.searchParams.append(key, value);
  });
  return target.toString();
}

export interface HeroFormHooks {
  /** Overridable so tests don't have to stub window.alert / navigation. */
  onAlert?: (message: string) => void;
  onNavigate?: (href: string) => void;
}

export function initHeroForm(
  root: ParentNode = document,
  hooks: HeroFormHooks = {},
): () => void {
  const form = root.querySelector('.hero__form');
  if (!form) return () => {};

  const alertFn = hooks.onAlert ?? ((message: string) => window.alert(message));
  const navigate =
    hooks.onNavigate ??
    ((href: string) => {
      window.location.href = href;
    });

  const onSubmit = (event: Event) => {
    event.preventDefault();

    const inputElement = form.querySelector('.hero__text-field');
    const url = inputElement instanceof HTMLInputElement ? inputElement.value : '';

    if (!validateURL(url)) {
      alertFn('Oops, try entering a valid URL!');
      return;
    }

    // Screened before the redirect so blocked URLs never reach start.coframe.com.
    if (isBlockedDomain(url)) {
      alertFn('This site cannot be analyzed. Please enter a business website.');
      return;
    }

    navigate(buildStartUrl(url, window.location.search));
  };

  const cta = form.querySelector('.cta');
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
