import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "LUMO Parent Auth",
  description: "Parent authentication flows for LUMO: AI Study Coach.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-body text-on-surface">
        {children}
      </body>
    </html>
  );
}
