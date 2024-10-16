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
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="my-8">
          {children}
        </div>
        <footer className="my-6 mx-6 text-xs">
        Copyright (c) 2024 SECURIX AG, <a href="https://github.com/securix-swiss/elastic-docker-images-vuln-report" target="blank" className="underline text-blue-600">Source</a>
        </footer>
      </body>
    </html>
  );
}
