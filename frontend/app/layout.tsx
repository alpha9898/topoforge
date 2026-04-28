import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TopoForge",
  description: "Convert LLD Excel sheets into editable Draw.io HLD diagrams."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
