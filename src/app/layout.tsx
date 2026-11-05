import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PHD Services — Release Management & Rights Clearance Portal',
  description: 'Enterprise release registration, rights clearance, asset delivery, and legal document execution platform for PHD Services.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
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
