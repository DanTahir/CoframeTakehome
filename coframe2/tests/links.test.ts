// Link integrity: the replica is homepage-only, so every link must resolve to the
// real coframe.com property rather than a dead local route.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { PROJECT_ROOT } from './helpers';

const GENERATED_DIR = path.join(PROJECT_ROOT, 'app', 'sections', 'generated');

function allHrefs(): string[] {
  const hrefs: string[] = [];
  for (const file of readdirSync(GENERATED_DIR).filter((f) => f.endsWith('.tsx'))) {
    const src = readFileSync(path.join(GENERATED_DIR, file), 'utf8');
    for (const m of src.matchAll(/href="([^"]*)"/g)) hrefs.push(m[1]);
  }
  return hrefs;
}

describe('outbound links', () => {
  const hrefs = allHrefs();

  it('finds the expected number of links', () => {
    expect(hrefs.length).toBeGreaterThan(40);
  });

  it('has no relative or root-relative page links', () => {
    // Everything must be absolute; the single "#" is present in the live source
    // too (a placeholder anchor), so it is allowed through unchanged.
    const offenders = hrefs.filter((h) => h !== '#' && !/^https?:\/\//.test(h));
    expect(offenders).toEqual([]);
  });

  it('keeps exactly the placeholder anchors the live source has', () => {
    expect(hrefs.filter((h) => h === '#')).toHaveLength(1);
  });

  it('points the main navigation at real coframe.com pages', () => {
    const coframe = hrefs.filter((h) => h.includes('www.coframe.com'));
    expect(coframe.length).toBeGreaterThanOrEqual(15);
    expect(coframe.every((h) => h.startsWith('https://www.coframe.com'))).toBe(true);
  });

  it('routes the product CTAs to the real app and onboarding hosts', () => {
    expect(hrefs.some((h) => h.startsWith('https://start.coframe.com'))).toBe(true);
    expect(hrefs.some((h) => h.startsWith('https://app.coframe.com'))).toBe(true);
  });

  it('keeps third-party social and partner links intact', () => {
    const joined = hrefs.join('\n');
    for (const host of ['x.com', 'linkedin.com', 'github.com', 'youtube.com']) {
      expect(joined).toContain(host);
    }
  });

  it('never leaves an unresolved template or local dev URL', () => {
    const offenders = hrefs.filter((h) => /localhost|127\.0\.0\.1|\{\{|%7B%7B/.test(h));
    expect(offenders).toEqual([]);
  });

  it('uses https everywhere', () => {
    const offenders = hrefs.filter((h) => h.startsWith('http://'));
    expect(offenders).toEqual([]);
  });
});
