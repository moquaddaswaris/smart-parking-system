import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import SkipLink from "@/components/SkipLink";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VisionPark • Smart Campus Parking",
  description: "Real-time automated parking occupancy and space availability monitor for RGIPT",
  applicationName: "VisionPark",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VisionPark",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased light`}>
      <body>
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
