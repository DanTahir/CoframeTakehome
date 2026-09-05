// GENERATED FILE — do not edit by hand.
// Composes every homepage block in exact source document order.
// Regenerate with `npm run codegen`.

import CursorContainerSection from './CursorContainerSection';
import NavWrapSection from './NavWrapSection';
import HeroSection from './HeroSection';
import IntroductionSection from './IntroductionSection';
import CompareSection from './CompareSection';
import Section from './Section';
import HowItWorksSection from './HowItWorksSection';
import FeaturesSection from './FeaturesSection';
import IntegrationsSection from './IntegrationsSection';
import SecuritySection from './SecuritySection';
import TestimonialsSection from './TestimonialsSection';
import BlogSection from './BlogSection';
import FooterContainerSection from './FooterContainerSection';
import DivSection from './DivSection';
import FloatingCtaSection from './FloatingCtaSection';
import CompareGridCellSection from './CompareGridCellSection';

export default function PageBody() {
  return (
    <>
      <CursorContainerSection />
      <NavWrapSection />
      <HeroSection />
      <div className="content cc-homepage">
        <IntroductionSection />
        <CompareSection />
        <Section />
        <HowItWorksSection />
        <FeaturesSection />
        <IntegrationsSection />
        <SecuritySection />
        <TestimonialsSection />
        <BlogSection />
      </div>
      <FooterContainerSection />
      <DivSection />
      <FloatingCtaSection />
      <CompareGridCellSection />
    </>
  );
}
