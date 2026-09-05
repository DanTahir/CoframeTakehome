import type { Metadata } from 'next';

// Order matters and mirrors the live document: self-hosted Google font faces,
// then the full Webflow stylesheet, then the inline <style> embeds (which
// override Webflow), then our own replica-only additions.
import './styles/fonts.css';
import './styles/webflow.css';
import './styles/embedded/index.css';
import './globals.css';

const TITLE = 'Coframe – Automate Website Growth 24/7';
const DESCRIPTION =
  'Transform your website with AI-driven optimization and personalization that boosts engagement and conversions. Coframe automates growth 24/7.';
const OG_IMAGE = '/assets/66f5e0-Coframe_OG_Image.webp';

/** Transcribed from the live <head>, with assets pointed at local copies. */
export const metadata: Metadata = {
  // Resolves the relative OG/Twitter image paths above to absolute URLs.
  metadataBase: new URL('https://www.coframe.com'),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://www.coframe.com' },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  icons: {
    shortcut: '/assets/66ede8-coframe-icon-32.png',
    apple: '/assets/66ede8-coframe-icon-256.jpg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `w-mod-js` is added by Webflow's bootstrap snippet and several CSS rules
    // key off it, so it is applied statically here.
    <html lang="en" className="w-mod-js" data-wf-domain="www.coframe.com">
      <body className="body">{children}</body>
    </html>
  );
}
