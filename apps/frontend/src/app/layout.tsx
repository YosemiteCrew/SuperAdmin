import type { Metadata } from "next";
import "./globals.css";

// React Bootstrap Started 
import 'bootstrap/dist/css/bootstrap.min.css';



export const metadata: Metadata = {
  title: "Yosemite-SuperAdmin",
  description: "Yosemite-SuperAdmin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
