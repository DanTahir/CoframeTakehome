import type { Metadata } from 'next';
import type * as React from 'react';

// Stylesheet order reproduces the original document exactly:
//   1. self-hosted Inter (the live page loads it via WebFont.load)
//   2. the shared Webflow stylesheet
//   3. the fancybox + swiper vendor CSS
//   4. the 21 inline <style> blocks, concatenated in source order
//   5. replica-only fixes
import './styles/fonts.css';
import './styles/webflow.css';
import './styles/vendor.css';
import './styles/embedded.css';
import './styles/globals.css';

const TITLE = 'Coframe – Automate Website Growth 24/7';
const DESCRIPTION =
  'Transform your website with AI-driven optimization and personalization that ' +
  'boosts engagement and conversions. Coframe automates growth 24/7.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL('https://www.coframe.com'),
  alternates: { canonical: 'https://www.coframe.com' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    images: [
      'https://cdn.prod.website-files.com/66abefe349b0c8356d750497/66f5e0c93f60a713ba3bdb35_Coframe%20OG%20Image.webp',
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      'https://cdn.prod.website-files.com/66abefe349b0c8356d750497/66f5e0c93f60a713ba3bdb35_Coframe%20OG%20Image.webp',
    ],
  },
  icons: {
    shortcut: '/assets/media/66ede8874f6828bd754cb46c_coframe-icon-32.png',
    apple: '/assets/media/66ede85a021aa859e5932ba4_coframe-icon-256.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    // The <html>/<body> attributes match the live document (minus the
    // Webflow/Intellimize tracking ids, which the replica deliberately omits).
    <html lang="en" data-wf-domain="www.coframe.com">
      <body className="body">{children}</body>
    </html>
  );
}
