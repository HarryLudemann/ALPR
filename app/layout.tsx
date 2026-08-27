import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Footer from "./components/Footer";
import Header from "./components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://alpr.harryludemann.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ALPR · Harry Ludemann",
    template: "%s · Harry Ludemann",
  },
  description:
    "New Zealand licence plate recognition. Drop a photo — inference runs on a Raspberry Pi at alpr.api.harryludemann.com.",
  openGraph: {
    title: "ALPR · Harry Ludemann",
    description: "Upload a vehicle photo and read NZ plates from a Raspberry Pi in the background.",
    type: "website",
    locale: "en_NZ",
    siteName: "Harry Ludemann ALPR",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-NZ"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-zinc-100">
        <div className="pointer-events-none fixed inset-0 hud-grid" />
        <div className="pointer-events-none fixed inset-0 scanlines" />
        <Header />
        <main className="relative z-10 flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
