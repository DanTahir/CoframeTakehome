import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
} from '@/app/sections/generated';

/**
 * Renders every generated section to confirm the markup is valid React and
 * still carries the copy, class names and data attributes the ported effects
 * and the Webflow stylesheet depend on.
 */
describe('every section renders', () => {
  const sections: Array<[string, () => React.JSX.Element]> = [
    ['NavSection', NavSection],
    ['HeroSection', HeroSection],
    ['IntroductionSection', IntroductionSection],
    ['CompareSection', CompareSection],
    ['OpenAiBannerSection', OpenAiBannerSection],
    ['HowItWorksSection', HowItWorksSection],
    ['FeaturesSection', FeaturesSection],
    ['IntegrationsSection', IntegrationsSection],
    ['SecuritySection', SecuritySection],
    ['TestimonialsSection', TestimonialsSection],
    ['BlogSection', BlogSection],
    ['FooterSection', FooterSection],
    ['FloatingCta', FloatingCta],
  ];

  it.each(sections)('%s renders without crashing', (_name, Component) => {
    const { container } = render(<Component />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe('hero section fidelity', () => {
  it('keeps the live headline copy', () => {
    const { container } = render(<HeroSection />);
    expect(container.textContent).toContain(
      'Coframe creates and tests variations of your website',
    );
  });

  it('carries all three retype variations for the animation engine', () => {
    const { container } = render(<HeroSection />);
    const heading = container.querySelector('[data-retype-text="true"]')!;

    expect(heading.getAttribute('data-retype-version-1')).toBe(
      'The most powerful way to increase website conversion.',
    );
    expect(heading.getAttribute('data-retype-version-2')).toBe(
      'Drive more conversion with AI-powered CRO.',
    );
    expect(heading.getAttribute('data-retype-version-3')).toBe(
      'The future of conversion optimization.',
    );
  });

  it('carries the cursor-animation settings the engine reads', () => {
    const { container } = render(<HeroSection />);
    const settings = container.querySelector('.cursor-animation__settings')!;

    expect(settings.getAttribute('data-animation-duration')).toBe('800');
    expect(settings.getAttribute('data-animation-retype')).toBe('true');
    expect(settings.getAttribute('data-animation-retype-loop')).toBe('true');
    expect(settings.getAttribute('data-animation-vertical-side')).toBe('bottom');
    expect(settings.getAttribute('data-animation-horizontal-side')).toBe('right');
  });

  it('includes the cursor, tag and metric elements', () => {
    const { container } = render(<HeroSection />);
    expect(container.querySelector('.cursor')).toBeTruthy();
    expect(container.querySelector('.tag')).toBeTruthy();
    expect(container.querySelector('.metric__number')).toBeTruthy();
  });

  it('wires the spotlight target and the Rive canvas', () => {
    const { container } = render(<HeroSection />);
    expect(container.querySelector('.hero__bg-elements')).toBeTruthy();

    const rive = container.querySelector('[data-animation-type="rive"]')!;
    expect(rive).toBeTruthy();
    expect(rive.querySelector('canvas')).toBeTruthy();
    expect(rive.getAttribute('data-rive-state-machine')).toBe('State Machine');
  });

  it('duplicates the logo list so the marquee can loop seamlessly', () => {
    const { container } = render(<HeroSection />);
    const lists = container.querySelectorAll(
      '.logo-marquee__logos-collection-list-wrapper',
    );
    // Two identical lists => translateX(-50%) lands on the duplicate's start.
    expect(lists.length).toBe(2);
  });

  it('renders the analyze-your-website form', () => {
    const { container } = render(<HeroSection />);
    expect(container.querySelector('.hero__form')).toBeTruthy();
    expect(container.querySelector('.hero__text-field')).toBeTruthy();
  });
});

describe('carousel markup contracts', () => {
  it('introduction exposes swiper slides and Webflow tab panes', () => {
    const { container } = render(<IntroductionSection />);
    expect(container.querySelector('.introduction.swiper')).toBeTruthy();
    expect(container.querySelectorAll('.introduction__step').length).toBe(3);
    expect(container.querySelectorAll('.w-tab-pane').length).toBe(3);
    // The first tab/pane starts active.
    expect(container.querySelector('.introduction__step.w--current')).toBeTruthy();
    expect(container.querySelector('.w-tab-pane.w--tab-active')).toBeTruthy();
  });

  it('testimonials exposes the case-studies swiper wrapper', () => {
    const { container } = render(<TestimonialsSection />);
    expect(container.querySelector('.swiper.swiper-case-studies')).toBeTruthy();
    const wrapper = container.querySelector('.swiper-wrapper.cc-case-studies')!;
    expect(wrapper).toBeTruthy();
    expect(wrapper.querySelectorAll('.swiper-slide').length).toBe(3);
  });
});

describe('navigation and footer', () => {
  it('nav renders dropdown toggles for the effect to bind to', () => {
    const { container } = render(<NavSection />);
    expect(container.querySelectorAll('.nav__dropdown-toggle').length).toBeGreaterThan(0);
    expect(container.querySelector('.nav')).toBeTruthy();
  });

  it('nav links point at the real coframe.com', () => {
    const { container } = render(<NavSection />);
    const hrefs = Array.from(container.querySelectorAll('a[href]')).map((a) =>
      a.getAttribute('href'),
    );

    expect(hrefs.length).toBeGreaterThan(5);
    for (const href of hrefs) {
      expect(href!.startsWith('https://') || href!.startsWith('#')).toBe(true);
    }
    expect(hrefs.some((h) => h!.includes('coframe.com'))).toBe(true);
  });

  it('footer renders the newsletter form and legal links', () => {
    const { container } = render(<FooterSection />);
    expect(container.querySelector('.newsletter-form__text-field')).toBeTruthy();
    expect(container.textContent).toMatch(/coframe/i);
  });
});

describe('fade-in coverage', () => {
  // Counts taken from the original scraped markup (scrape/sections/*.html).
  // Compare, Integrations, OpenAI banner, nav, footer and the floating CTA
  // ship no .fade-in elements on the live site, so none are asserted here.
  const expected: Array<[string, () => React.JSX.Element, number]> = [
    ['IntroductionSection', IntroductionSection, 3],
    ['HowItWorksSection', HowItWorksSection, 9],
    ['FeaturesSection', FeaturesSection, 14],
    ['SecuritySection', SecuritySection, 13],
    ['TestimonialsSection', TestimonialsSection, 2],
    ['BlogSection', BlogSection, 5],
  ];

  it.each(expected)(
    '%s ships the same number of .fade-in elements as the live site',
    (_name, Component, count) => {
      const { container } = render(<Component />);
      expect(container.querySelectorAll('.fade-in').length).toBe(count);
    },
  );

  it('leaves sections that have no reveal on the live site untouched', () => {
    for (const Component of [CompareSection, IntegrationsSection, OpenAiBannerSection]) {
      const { container } = render(<Component />);
      expect(container.querySelectorAll('.fade-in').length).toBe(0);
    }
  });
});
