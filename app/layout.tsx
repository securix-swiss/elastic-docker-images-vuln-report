import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <div className="flex-grow my-8">{children}</div>
        <footer className="mt-auto py-6 text-center text-xs">
          Copyright (c) {currentYear} SECURIX AG,{" "}
          <a
            href="https://github.com/securix-swiss/elastic-docker-images-vuln-report"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600"
          >
            Source
          </a>
        </footer>
      </body>
    </html>
  );
}
