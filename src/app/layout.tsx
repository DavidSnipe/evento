import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import { ro } from "@/lib/i18n/ro";
import { TopLoader } from "@/components/layout/top-loader";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: ro.metadata.title,
    template: "%s | Evento",
  },
  description: ro.metadata.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <TopLoader />
        {children}
      </body>
    </html>
  );
}
