import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from 'next/font/google';
import { Providers } from './providers';
import "./globals.css";

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans', weight: ['400', '500', '600', '700'] });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display', weight: ['400', '500', '600', '700'], style: ['normal', 'italic'] });

export const metadata: Metadata = {
  title: "Purch",
  description: "AI-powered shopping assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${playfair.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
