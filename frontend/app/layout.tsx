import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "QuickNotes — AI-Powered Note Generator",
  description:
    "Turn YouTube videos, PDFs, and articles into structured Markdown notes using LangGraph + your preferred LLM.",
  openGraph: {
    title: "QuickNotes",
    description: "AI-powered note generator. YouTube, PDFs, articles → structured Markdown.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable} h-full`}
    >
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
