// Structural fidelity: the rendered replica body vs the raw scraped homepage.
//
// These are the strongest tests in the suite - rather than spot-checking a
// handful of selectors, they build full frequency maps of every class token and
// every tag in both documents and require them to match exactly.
import { describe, expect, it } from 'vitest';

import {
  classTokenCounts,
  rawBodyHtml,
  renderBodyMarkup,
  stripSynthesizedPreloads,
  tagCounts,
} from './helpers';

function diffCounts(
  expected: Map<string, number>,
  actual: Map<string, number>,
): Array<{ key: string; expected: number; actual: number }> {
  const keys = new Set([...expected.keys(), ...actual.keys()]);
  const diffs: Array<{ key: string; expected: number; actual: number }> = [];
  for (const key of keys) {
    const e = expected.get(key) ?? 0;
    const a = actual.get(key) ?? 0;
    if (e !== a) diffs.push({ key, expected: e, actual: a });
  }
  return diffs.sort((x, y) => Math.abs(y.expected - y.actual) - Math.abs(x.expected - x.actual));
}

describe('markup fidelity vs live source', () => {
  const raw = rawBodyHtml();
  const rendered = stripSynthesizedPreloads(renderBodyMarkup());

  it('renders a non-trivial amount of markup', () => {
    expect(rendered.length).toBeGreaterThan(100_000);
  });

  it('reproduces every class token with the same multiplicity', () => {
    const diffs = diffCounts(classTokenCounts(raw), classTokenCounts(rendered));
    expect(diffs).toEqual([]);
  });

  it('reproduces every element type with the same multiplicity', () => {
    const diffs = diffCounts(tagCounts(raw), tagCounts(rendered));
    expect(diffs).toEqual([]);
  });

  it('only ever strips preload hints, never real markup', () => {
    // Guards the normalisation above: if the generator ever emitted a real
    // <link> in the body, or React stopped hoisting, this would catch it.
    const full = renderBodyMarkup();
    const removed = (full.match(/<link\b[^>]*>/gi) ?? []).length;
    const remaining = (stripSynthesizedPreloads(full).match(/<link\b[^>]*>/gi) ?? []).length;
    expect(removed).toBe(11);
    expect(remaining).toBe(0);
  });
});
