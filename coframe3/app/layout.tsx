import type { Metadata, Viewport } from 'next';
import './globals.css';

/**
 * Metadata is transcribed from the source document's <head>, with the OG and
 * icon images pointed at the self-hosted copies under /assets.
 */
export const metadata: Metadata = {
  title: 'Coframe \u2013 Automate Website Growth 24/7',
  description:
    'Transform your website with AI-driven optimization and personalization that boosts engagement and conversions. Coframe automates growth 24/7.',
  openGraph: {
    type: 'website',
    title: 'Coframe \u2013 Automate Website Growth 24/7',
    description:
      'Transform your website with AI-driven optimization and personalization that boosts engagement and conversions. Coframe automates growth 24/7.',
    images: ['/assets/img/66f5e0c93f60a713ba3bdb35_Coframe-OG-Image.webp'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coframe \u2013 Automate Website Growth 24/7',
    description:
      'Transform your website with AI-driven optimization and personalization that boosts engagement and conversions. Coframe automates growth 24/7.',
    images: ['/assets/img/66f5e0c93f60a713ba3bdb35_Coframe-OG-Image.webp'],
  },
  icons: {
    shortcut: [
      {
        url: '/assets/img/66ede8874f6828bd754cb46c_coframe-icon-32.png',
        type: 'image/png',
      },
    ],
    apple: ['/assets/img/66ede85a021aa859e5932ba4_coframe-icon-256.82ce6f2c.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `w-mod-js` is added by Webflow's boot script and several CSS rules key
    // off it; `w-mod-touch` is added only on touch devices, so it is applied at
    // runtime rather than baked in here.
    <html lang="en" className="w-mod-js">
      <body className="body">{children}</body>
    </html>
  );
}
