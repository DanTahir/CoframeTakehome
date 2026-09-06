/**
 * Hero spotlight: a mouse-tracked mask over `.hero__bg-elements`.
 *
 * Ported verbatim from `scrape/analysis/script-18.js`. The CSS reads `--x` /
 * `--y` custom properties for the mask centre; the element starts fully
 * transparent and fades in on first pointer movement inside the hero.
 */
import type { Teardown } from './runtime';

export function initCoframeHeroSpotlight(root: ParentNode = document): Teardown | void {
  const heroContainer = root.querySelector<HTMLElement>('.hero');
  const heroBg = root.querySelector<HTMLElement>('.hero__bg-elements');
  if (!heroContainer || !heroBg) return;

  const onMouseMove = (e: MouseEvent) => {
    const rect = heroContainer.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 100;
    const relY = ((e.clientY - rect.top) / rect.height) * 100;

    heroBg.style.setProperty('--x', `${relX}%`);
    heroBg.style.setProperty('--y', `${relY}%`);
    heroBg.style.opacity = '1';
  };

  const onMouseLeave = (e: MouseEvent) => {
    const related = e.relatedTarget as Node | null;
    if (!related || !heroContainer.contains(related)) heroBg.style.opacity = '0';
  };

  const onWindowMouseOut = (e: MouseEvent) => {
    if (!e.relatedTarget && e.clientY <= 0) heroBg.style.opacity = '0';
  };

  heroContainer.addEventListener('mousemove', onMouseMove);
  heroContainer.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('mouseout', onWindowMouseOut);

  return () => {
    heroContainer.removeEventListener('mousemove', onMouseMove);
    heroContainer.removeEventListener('mouseleave', onMouseLeave);
    window.removeEventListener('mouseout', onWindowMouseOut);
    heroBg.style.opacity = '';
    heroBg.style.removeProperty('--x');
    heroBg.style.removeProperty('--y');
  };
}
