'use client';

import Carousels from './Carousels';
import CursorContainerSizer from './CursorContainerSizer';
import CursorRetypeAnimation from './CursorRetypeAnimation';
import FadeInEffects from './useFadeIn';
import HeroForm from './HeroForm';
import HeroSpotlight from './HeroSpotlight';
import NavInteractions from './NavInteractions';
import RiveChart from './RiveChart';

/**
 * Single mount point for every behaviour the original page loaded as inline
 * <script> embeds. Each child renders nothing and only attaches listeners /
 * observers on mount, so markup stays server-rendered.
 */
export default function SiteEffects() {
  return (
    <>
      <FadeInEffects />
      <CursorContainerSizer />
      <CursorRetypeAnimation />
      <HeroSpotlight />
      <HeroForm />
      <NavInteractions />
      <Carousels />
      <RiveChart />
    </>
  );
}
