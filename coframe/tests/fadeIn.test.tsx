import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FadeInEffects from '@/app/effects/useFadeIn';

/**
 * The IntersectionObserver stub in tests/setup.ts reports every observed
 * element as immediately intersecting, so mounting the hook should reveal all
 * `.fade-in` elements and apply the correct stagger delay.
 */
describe('fade-in reveal', () => {
  it('adds .faded-in to every fade-in element', () => {
    document.body.innerHTML = `
      <div class="fade-in" id="a"></div>
      <div class="fade-in" id="b"></div>
      <div id="c"></div>
    `;

    render(<FadeInEffects />);

    expect(document.getElementById('a')!.classList.contains('faded-in')).toBe(true);
    expect(document.getElementById('b')!.classList.contains('faded-in')).toBe(true);
    expect(document.getElementById('c')!.classList.contains('faded-in')).toBe(false);
  });

  it('maps data-fade-delay to the original s/m/l/xl timings', () => {
    document.body.innerHTML = `
      <div class="fade-in" id="none"></div>
      <div class="fade-in" id="s" data-fade-delay="s"></div>
      <div class="fade-in" id="m" data-fade-delay="m"></div>
      <div class="fade-in" id="l" data-fade-delay="l"></div>
      <div class="fade-in" id="xl" data-fade-delay="xl"></div>
    `;

    render(<FadeInEffects />);

    expect(document.getElementById('none')!.style.animationDelay).toBe('0s');
    expect(document.getElementById('s')!.style.animationDelay).toBe('0.4s');
    expect(document.getElementById('m')!.style.animationDelay).toBe('0.8s');
    expect(document.getElementById('l')!.style.animationDelay).toBe('1.2s');
    expect(document.getElementById('xl')!.style.animationDelay).toBe('1.6s');
  });

  it('ignores an unknown delay token rather than breaking', () => {
    document.body.innerHTML = '<div class="fade-in" id="weird" data-fade-delay="zzz"></div>';
    render(<FadeInEffects />);
    expect(document.getElementById('weird')!.style.animationDelay).toBe('0s');
    expect(document.getElementById('weird')!.classList.contains('faded-in')).toBe(true);
  });

  it('does not throw when there is nothing to reveal', () => {
    document.body.innerHTML = '<div></div>';
    expect(() => render(<FadeInEffects />)).not.toThrow();
  });
});
