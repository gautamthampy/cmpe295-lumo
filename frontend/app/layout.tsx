import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LUMO - AI Study Coach',
  description: 'Multi-agent AI Study Coach for Elementary Education',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

