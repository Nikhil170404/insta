import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navigation } from "@/components/ui/Navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "ReplyKaro - Instagram Engagement Automation",
    template: "%s | ReplyKaro",
  },
  description:
    "Reply Karo, Reach Badao! Automate your Instagram DMs and engage your audience instantly.",
  icons: {
    icon: "/favicon.png",
    apple: "/logo.png",
  },
  keywords: [
    "Instagram engagement",
    "DM automation",
    "creator tools",
    "social media reach",
  ],
  authors: [{ name: "ReplyKaro" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://replykaro.com",
    siteName: "ReplyKaro",
    title: "ReplyKaro - Instagram Engagement Automation",
    description: "Reply Karo, Reach Badao! Automate your Instagram DMs and build community.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReplyKaro - Instagram Engagement Automation",
    description: "Reply Karo, Reach Badao! Automate your Instagram DMs and build authentic connections.",
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
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}
