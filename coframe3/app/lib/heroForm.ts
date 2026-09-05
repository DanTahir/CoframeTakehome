/**
 * Hero "analyze your website" form.
 *
 * Faithful port of the original inline handler, including its NSFW/adult
 * blocklist (kept verbatim so the replica rejects exactly the same input) and
 * its attribution behaviour: the typed URL is passed to start.coframe.com as
 * `url`, and every other query param the visitor arrived with is forwarded.
 */

export const HERO_FORM_TARGET = 'https://start.coframe.com/';

export const BLOCKED_DOMAINS: ReadonlySet<string> = new Set([
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

export const BLOCKED_KEYWORDS: readonly string[] = [
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
  for (const keyword of BLOCKED_KEYWORDS) {
    if (stem.includes(keyword)) return true;
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
  return pattern.test(url);
}

/** Builds the start.coframe.com hand-off URL, forwarding attribution params. */
export function buildHeroTarget(url: string, search: string): string {
  const target = new URL(HERO_FORM_TARGET);
  target.searchParams.set('url', url);
  new URLSearchParams(search).forEach((value, key) => {
    if (key !== 'url') target.searchParams.append(key, value);
  });
  return target.toString();
}

export function initHeroForm(): () => void {
  const form = document.querySelector<HTMLFormElement>('.hero__form');
  if (!form) return () => {};

  const onSubmit = (event: Event) => {
    event.preventDefault();

    const input = document.querySelector<HTMLInputElement>('.hero__form .hero__text-field');
    const url = input?.value ?? '';

    if (!validateURL(url)) {
      window.alert('Oops, try entering a valid URL!');
      return;
    }

    if (isBlockedDomain(url)) {
      window.alert('This site cannot be analyzed. Please enter a business website.');
      return;
    }

    window.location.href = buildHeroTarget(url, window.location.search);
  };

  const cta = form.querySelector<HTMLElement>('.cta');
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
