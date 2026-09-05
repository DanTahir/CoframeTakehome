import { describe, expect, it } from 'vitest';
import {
  BLOCKED_DOMAINS,
  buildHeroTarget,
  HERO_FORM_TARGET,
  isBlockedDomain,
  validateURL,
} from '../app/lib/heroForm';

describe('validateURL', () => {
  it('accepts the shapes a visitor actually types', () => {
    for (const url of [
      'example.com',
      'www.example.com',
      'https://example.com',
      'http://example.co.uk',
      'https://example.com/pricing',
      'https://example.com:8443/a/b?x=1#frag',
      'sub.domain.example.io',
    ]) {
      expect(validateURL(url), url).toBe(true);
    }
  });

  it('rejects input that is not a URL', () => {
    for (const url of ['', 'not a url', 'http://', '???']) {
      expect(validateURL(url), url).toBe(false);
    }
  });
});

describe('isBlockedDomain', () => {
  it('blocks an exact listed domain regardless of scheme or www', () => {
    expect(isBlockedDomain('pornhub.com')).toBe(true);
    expect(isBlockedDomain('https://www.pornhub.com')).toBe(true);
    expect(isBlockedDomain('https://pornhub.com/some/path')).toBe(true);
    expect(isBlockedDomain('PORNHUB.COM')).toBe(true);
  });

  it('blocks subdomains of a listed domain', () => {
    expect(isBlockedDomain('cdn.onlyfans.com')).toBe(true);
  });

  it('blocks unlisted domains whose name contains a blocked keyword', () => {
    expect(isBlockedDomain('some-porn-site.com')).toBe(true);
    expect(isBlockedDomain('myfetishblog.net')).toBe(true);
  });

  it('allows ordinary business sites', () => {
    for (const url of [
      'coframe.com',
      'https://www.stripe.com',
      'vercel.com',
      'example.com',
      'sussex.ac.uk',
    ]) {
      expect(isBlockedDomain(url), url).toBe(false);
    }
  });

  it('does not treat empty input as blocked', () => {
    expect(isBlockedDomain('')).toBe(false);
  });

  it('carries the full blocklist from the original script', () => {
    // Spot-check size and a few entries so an accidental truncation is caught.
    expect(BLOCKED_DOMAINS.size).toBeGreaterThan(60);
    expect(BLOCKED_DOMAINS.has('chaturbate.com')).toBe(true);
    expect(BLOCKED_DOMAINS.has('coomer.su')).toBe(true);
  });
});

describe('buildHeroTarget', () => {
  it('hands the typed URL to start.coframe.com', () => {
    const target = new URL(buildHeroTarget('example.com', ''));
    expect(`${target.origin}/`).toBe(HERO_FORM_TARGET);
    expect(target.searchParams.get('url')).toBe('example.com');
  });

  it('forwards the visitor\'s other query params for attribution', () => {
    const target = new URL(
      buildHeroTarget('example.com', '?utm_source=x&utm_campaign=launch'),
    );
    expect(target.searchParams.get('url')).toBe('example.com');
    expect(target.searchParams.get('utm_source')).toBe('x');
    expect(target.searchParams.get('utm_campaign')).toBe('launch');
  });

  it('does not let an inbound `url` param override the typed value', () => {
    const target = new URL(buildHeroTarget('typed.com', '?url=attacker.com'));
    expect(target.searchParams.getAll('url')).toEqual(['typed.com']);
  });
});
