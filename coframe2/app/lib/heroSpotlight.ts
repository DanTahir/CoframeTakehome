// Hero cursor spotlight.
// Ported from the page's inline hero script: mousemove over .hero sets --x/--y on
// .hero__bg-elements (which is masked by a radial gradient in the embedded CSS) and
// fades it in; leaving the hero or the window fades it back out.

export function initHeroSpotlight(root: ParentNode = document): () => void {
  const heroContainer = root.querySelector('.hero');
  const heroBg = root.querySelector('.hero__bg-elements');
  if (!heroContainer || !(heroBg instanceof HTMLElement)) return () => {};

  const onMouseMove = (event: Event) => {
    const e = event as MouseEvent;
    const rect = heroContainer.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 100;
    const relY = ((e.clientY - rect.top) / rect.height) * 100;
    heroBg.style.setProperty('--x', `${relX}%`);
    heroBg.style.setProperty('--y', `${relY}%`);
    heroBg.style.opacity = '1';
  };

  const onMouseLeave = (event: Event) => {
    const e = event as MouseEvent;
    const related = e.relatedTarget;
    if (!related || !(related instanceof Node) || !heroContainer.contains(related)) {
      heroBg.style.opacity = '0';
    }
  };

  const onWindowMouseOut = (event: Event) => {
    const e = event as MouseEvent;
    if (!e.relatedTarget && e.clientY <= 0) heroBg.style.opacity = '0';
  };

  heroContainer.addEventListener('mousemove', onMouseMove);
  heroContainer.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('mouseout', onWindowMouseOut);

  return () => {
    heroContainer.removeEventListener('mousemove', onMouseMove);
    heroContainer.removeEventListener('mouseleave', onMouseLeave);
    window.removeEventListener('mouseout', onWindowMouseOut);
  };
}
