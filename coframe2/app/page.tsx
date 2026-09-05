import type * as React from 'react';

import { ClientRuntime } from './components/ClientRuntime';
import {
  ContentSections,
  CursorContainer,
  EmbeddedStylesAndScripts,
  FloatingCta,
  FooterSection,
  HeroSection,
  NavSection,
  OrphanCompareCell,
} from './sections/generated';

// Children are emitted in the same order as the live document's <body>.
export default function HomePage(): React.JSX.Element {
  return (
    <>
      <CursorContainer />
      <NavSection />
      <HeroSection />
      <ContentSections />
      <FooterSection />
      <EmbeddedStylesAndScripts />
      <FloatingCta />
      <OrphanCompareCell />
      <ClientRuntime />
    </>
  );
}
