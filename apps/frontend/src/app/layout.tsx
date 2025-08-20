import type { Metadata } from "next";
import "./globals.css";
// React Bootstrap Started 
import 'bootstrap/dist/css/bootstrap.min.css';

///for Toast
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <ToastContainer position="top-right" autoClose={3000} />
      </body>
    </html>
  );
}
