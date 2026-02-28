import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LUMO — AI Tutoring System',
  description: 'Multi-agent AI tutoring for elementary education',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
