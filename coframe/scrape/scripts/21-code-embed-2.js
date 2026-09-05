// ── NSFW / adult blocklist ─────────────────────────────────
  // Mirror of small-fish blocklist (frontend + backend). Update all
  // three together so a domain blocked in one is blocked everywhere.
  const BLOCKED_DOMAINS = new Set([
    'pornhub.com','xvideos.com','xnxx.com','xhamster.com','redtube.com',
    'youporn.com','tube8.com','spankbang.com','eporner.com','pornone.com',
    'tnaflix.com','drtuber.com','hclips.com','txxx.com','porntrex.com',
    'fuq.com','beeg.com','nuvid.com','porn.com','thumbzilla.com',
    'pornpics.com','sex.com',
    'chaturbate.com','stripchat.com','bongacams.com','livejasmin.com',
    'cam4.com','myfreecams.com','camsoda.com','flirt4free.com',
    'onlyfans.com','fansly.com','manyvids.com',
    'brazzers.com','realitykings.com','bangbros.com','naughtyamerica.com',
    'mofos.com','digitalplayground.com','wicked.com','fakehub.com',
    'teamskeet.com','babes.com','twistys.com','penthouse.com',
    'playboy.com','hustler.com',
    'adultfriendfinder.com','ashleymadison.com','fetlife.com',
    'literotica.com','hentaihaven.xxx','hanime.tv','nhentai.net',
    'rule34.xxx','e621.net','gelbooru.com','danbooru.donmai.us',
    'motherless.com','heavy-r.com','efukt.com','bestgore.com',
    'theync.com','crazyshit.com','kaotic.com',
    'leaked.com','fapello.com','coomer.su','simpcity.su',
  ]);
  const BLOCKED_KEYWORDS = [
    'porn','xxx','nsfw','hentai','erotic','camgirl','livecam','sexcam',
    'adultvideo','fapfap','bigtits','nudes','escort','cumshot','blowjob',
    'milfs','fetish',
  ];
  function isBlockedDomain(input) {
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

  // ── Form submit handler ────────────────────────────────────
  document.querySelector('.hero__form').addEventListener('submit', function(event) {
    event.preventDefault();

    const inputElement = document.querySelector('.hero__form .hero__text-field');
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

    // Build the redirect URL: keep `url=<typed>` and forward EVERY query
    // param the visitor landed with — gclid, gbraid, utm_*, hsa_*, gad_*,
    // fbclid, li_fat_id, etc. The small-fish ATTRIBUTION_KEYS capture set
    // on start.coframe.com reads them off window.location.search, so as
    // long as we hand them through, full Google Ads attribution lands on
    // the lead row + the HubSpot contact.
    const target = new URL('https://start.coframe.com/');
    target.searchParams.set('url', url);
    new URLSearchParams(window.location.search).forEach(function (value, key) {
      if (key !== 'url') target.searchParams.append(key, value);
    });

    window.location.href = target.toString();
  });

  // Also submit when the CTA button is clicked.
  document.querySelector('.hero__form .cta').addEventListener('click', function(event) {
    event.preventDefault();
    document.querySelector('.hero__form').dispatchEvent(new Event('submit'));
  });

  function validateURL(url) {
    const pattern = new RegExp(
      '^(https?:\\/\\/)?' +
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z\\d]{2,})' +
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
      '(\\?[;&a-z\\d%_.~+=-]*)?' +
      '(\\#[-a-z\\d_]*)?$',
      'i'
    );
    return !!pattern.test(url);
  }