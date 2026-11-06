import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#171717',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://media.phantomdigital.com.ng'),
  title: {
    default: 'PHD Services — Release Management & Rights Clearance Portal',
    template: '%s | PHD Services',
  },
  description:
    'Enterprise release registration, rights clearance, asset delivery, and legal document execution platform operated by PHD Services.',
  applicationName: 'PHD Media Portal',
  authors: [{ name: 'PHD Services Operations' }],
  creator: 'PHD Services',
  publisher: 'PHD Services Ltd.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://media.phantomdigital.com.ng',
    siteName: 'PHD Media Portal',
    title: 'PHD Services — Release Management & Rights Clearance Portal',
    description:
      'Enterprise music release registration, master audio delivery, statutory rights clearances, and digital document execution for PHD Services.',
    images: [
      {
        url: '/images/phd-logo.png',
        width: 500,
        height: 500,
        alt: 'PHD Services Monochromatic Insignia',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'PHD Services — Release Management & Rights Clearance Portal',
    description:
      'Enterprise release management and rights clearance platform operated by PHD Services.',
    images: ['/images/phd-logo.png'],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F4F4F2] text-[#171717] antialiased selection:bg-[#171717] selection:text-white">
        {children}
      </body>
    </html>
  );
}
