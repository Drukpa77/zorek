import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { companyName } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: `${companyName} — Digital Product & Software Engineering`,
    template: `%s — ${companyName}`,
  },
  description:
    "We design and engineer digital platforms, software and experiences that help organisations operate better, serve customers better and grow.",
};

export const viewport: Viewport = {
  themeColor: "#EEEDE8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
