'use client';

import { useEffect } from 'react';

/**
 * Hero pointer spotlight — port of scrape/scripts/20-code-embed.js.
 *
 * Moving the pointer over the hero sets `--x` / `--y` on the masked background
 * image and fades it in; leaving the hero (or the window) fades it back out.
 */
export function initHeroSpotlight(root: ParentNode = document): () => void {
  const hero = root.querySelector<HTMLElement>('.hero');
  const heroBg = root.querySelector<HTMLElement>('.hero__bg-elements');
  if (!hero || !heroBg) return () => {};

  const onMouseMove = (event: MouseEvent) => {
    const rect = hero.getBoundingClientRect();
    const relX = ((event.clientX - rect.left) / rect.width) * 100;
    const relY = ((event.clientY - rect.top) / rect.height) * 100;
    heroBg.style.setProperty('--x', `${relX}%`);
    heroBg.style.setProperty('--y', `${relY}%`);
    heroBg.style.opacity = '1';
  };

  const onMouseLeave = (event: MouseEvent) => {
    const related = event.relatedTarget as Node | null;
    if (!related || !hero.contains(related)) {
      heroBg.style.opacity = '0';
    }
  };

  const onWindowMouseOut = (event: MouseEvent) => {
    if (!event.relatedTarget && event.clientY <= 0) {
      heroBg.style.opacity = '0';
    }
  };

  hero.addEventListener('mousemove', onMouseMove);
  hero.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('mouseout', onWindowMouseOut);

  return () => {
    hero.removeEventListener('mousemove', onMouseMove);
    hero.removeEventListener('mouseleave', onMouseLeave);
    window.removeEventListener('mouseout', onWindowMouseOut);
  };
}

export default function HeroSpotlight() {
  useEffect(() => initHeroSpotlight(), []);
  return null;
}
