import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZIVA | VJ Score Management",
  description: "ZIVA VJ Score Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
