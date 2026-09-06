/**
 * Hero "spotlight": the background element follows the pointer via --x/--y CSS
 * custom properties and fades out when the pointer leaves the hero or the
 * window. Faithful port of the site's inline hero script.
 */
import { type Teardown } from './runtime';

export function initCoframeHeroSpotlight(root: ParentNode = document): Teardown | void {
  const scope: ParentNode = root ?? document;
  const heroContainer = scope.querySelector<HTMLElement>('.hero');
  const heroBg = scope.querySelector<HTMLElement>('.hero__bg-elements');
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
    const related = e.relatedTarget;
    if (!related || !(related instanceof Node) || !heroContainer.contains(related)) {
      heroBg.style.opacity = '0';
    }
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
    heroBg.style.removeProperty('opacity');
  };
}
