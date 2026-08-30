import type { Metadata } from "next";
import "./globals.css";
import { PageTurnSound } from "@/components/page-turn-sound";

export const metadata: Metadata = {
  title: "Canvas Ratio",
  description: "A drawing-book approach to daily time allocation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased"><PageTurnSound />{children}</body>
    </html>
  );
}
