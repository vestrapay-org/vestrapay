import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vestrapay Checkout",
  description: "Vestrapay - Checkout",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
