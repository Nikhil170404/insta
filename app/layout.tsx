import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "ReplyKaro - Instagram DM Automation",
    template: "%s | ReplyKaro",
  },
  description:
    "Reply Karo, Sales Badao! Automate your Instagram DMs with keyword-based responses.",
  keywords: [
    "Instagram automation",
    "DM automation",
    "Instagram marketing",
    "social media automation",
  ],
  authors: [{ name: "ReplyKaro" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://replykaro.com",
    siteName: "ReplyKaro",
    title: "ReplyKaro - Instagram DM Automation",
    description: "Reply Karo, Sales Badao! Automate your Instagram DMs.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReplyKaro - Instagram DM Automation",
    description: "Reply Karo, Sales Badao! Automate your Instagram DMs.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
