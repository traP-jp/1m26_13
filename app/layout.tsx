import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeQtures | traP 講習会",
  description: "LeQturesは、講習会を開催すると、そのまま次の人が学べる資産になるサービスです。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
