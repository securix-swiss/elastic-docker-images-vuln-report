import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Elastic Docker Image CVE Overview",
  description: "CVE overview for elastic docker images",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentYear = new Date().getFullYear();
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <div className="flex-grow my-8">
          {children}
        </div>
        <footer className="mt-auto py-6 text-center text-xs">
          Copyright (c) {currentYear} SECURIX AG, <a href="https://github.com/securix-swiss/elastic-docker-images-vuln-report" target="blank" className="underline text-blue-600">Source</a>
        </footer>
      </body>
    </html>
  );
}
