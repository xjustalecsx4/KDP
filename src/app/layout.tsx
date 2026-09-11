import { connection } from "next/server";
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "KDP Content Automation", template: "%s · KDP" },
  description: "Private book content workspace",
  robots: { index: false, follow: false },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
