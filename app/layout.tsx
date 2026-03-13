import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif, Sora } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  style: ["normal", "italic"],
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PoolFi",
  description:
    "PoolFi helps groups collect money transparently without awkward chasing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${sora.variable} ${instrumentSerif.variable} antialiased`}>{children}</body>
    </html>
  );
}
