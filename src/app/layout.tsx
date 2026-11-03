import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PHD Services — Release Management & Rights Clearance Portal',
  description: 'Enterprise release registration, rights clearance, asset delivery, and legal document execution platform for PHD Services.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0D11] text-[#F3F4F6] antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

