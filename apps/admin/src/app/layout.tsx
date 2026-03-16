import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Super Admin",
  description:
    "Yosemite Crew Super Admin Dashboard - Manage leads, businesses, support tickets, and team members",
  icons: {
    icon: "/assets/yosemite-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta httpEquiv="content-language" content="en" />
        <link
          rel="preload"
          href="/fonts/satoshi-font/Satoshi-Medium.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/satoshi-font/Satoshi-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
