import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Rototip Award Planner",
  description: "Compare RFQ bids and prepare an award plan.",
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
