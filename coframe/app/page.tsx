import SiteEffects from './effects/SiteEffects';
import {
  BlogSection,
  CompareSection,
  FeaturesSection,
  FloatingCta,
  FooterSection,
  HeroSection,
  HowItWorksSection,
  IntegrationsSection,
  IntroductionSection,
  NavSection,
  OpenAiBannerSection,
  SecuritySection,
  TestimonialsSection,
} from './sections/generated';

/**
 * The coframe.com homepage, composed in the same order as the live document.
 * Every section is server-rendered static markup; `SiteEffects` attaches the
 * client-side behaviour afterwards.
 */
export default function HomePage() {
  return (
    <>
      <NavSection />
      <HeroSection />
      <IntroductionSection />
      <CompareSection />
      <OpenAiBannerSection />
      <HowItWorksSection />
      <FeaturesSection />
      <IntegrationsSection />
      <SecuritySection />
      <TestimonialsSection />
      <BlogSection />
      <FooterSection />
      <FloatingCta />

      {/*
        Absolute positioning context for the collaborator cursors; kept sized
        to the whole document by CursorContainerSizer.
      */}
      <div id="cursor-container" className="cursor-container" />

      <SiteEffects />
    </>
  );
}
