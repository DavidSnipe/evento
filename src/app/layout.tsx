import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ro } from "@/lib/i18n/ro";
import { TopLoader } from "@/components/layout/top-loader";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
      <body className={`${inter.variable} font-sans antialiased`}>
        <TopLoader />
        {children}
      </body>
    </html>
  );
}
