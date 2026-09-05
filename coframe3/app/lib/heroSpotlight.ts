/**
 * Hero cursor spotlight.
 *
 * Faithful port: mousemove over `.hero` writes the pointer position into the
 * `--x` / `--y` custom properties on `.hero__bg-elements` (whose CSS mask is a
 * radial gradient centred on those vars) and fades the layer in. Leaving the
 * hero — or the window entirely via the top edge — fades it back out.
 */

export function initHeroSpotlight(): () => void {
  const hero = document.querySelector<HTMLElement>('.hero');
  const heroBg = document.querySelector<HTMLElement>('.hero__bg-elements');
  if (!hero || !heroBg) return () => {};

  const onMouseMove = (event: MouseEvent) => {
    const rect = hero.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const relX = ((event.clientX - rect.left) / rect.width) * 100;
    const relY = ((event.clientY - rect.top) / rect.height) * 100;

    heroBg.style.setProperty('--x', `${relX}%`);
    heroBg.style.setProperty('--y', `${relY}%`);
    heroBg.style.opacity = '1';
  };

  const onMouseLeave = (event: MouseEvent) => {
    const related = event.relatedTarget as Node | null;
    if (!related || !hero.contains(related)) heroBg.style.opacity = '0';
  };

  const onWindowMouseOut = (event: MouseEvent) => {
    if (!event.relatedTarget && event.clientY <= 0) heroBg.style.opacity = '0';
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
