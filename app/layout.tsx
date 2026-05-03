import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIForge — Catch CI rot before it ships",
  description:
    "A GitHub App that posts a single PR comment when your code makes CI slower — with the likely cause and the cost.",
  metadataBase: new URL("https://ciforge.dev"),
  openGraph: {
    title: "CIForge — Catch CI rot before it ships",
    description:
      "PR-time CI regression detection. Single comment, edited in place, with cause attribution and cost.",
    type: "website"
  },
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23050507'/%3E%3Cpath d='M8 22 L14 10 L20 18 L24 12' stroke='%23f5a524' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
        type: "image/svg+xml"
      }
    ]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="bg-ink-950 text-ink-50 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
