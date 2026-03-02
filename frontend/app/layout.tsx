import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import AgentPanel from '@/components/layout/AgentPanel';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LUMO | AI Study Coach',
  description: 'A multi-agent AI study coach for elementary students.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} antialiased`}>
        <div className="flex h-screen w-full overflow-hidden relative selection:bg-violet-200 selection:text-violet-900">
          <Sidebar />
          <main className="flex-1 flex flex-col m-4 ml-0 relative z-10 overflow-y-auto">
            {children}
          </main>
          <AgentPanel />
        </div>
      </body>
    </html>
  );
}
