import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: '1-Monthon β',
  description: '過去の講習会と教材を見つけ、次の学びへつなぐ内部試用版',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: '1-Monthon β',
    title: '1-Monthon β',
    description: '過去の講習会と教材を見つけ、次の学びへつなぐ内部試用版',
    images: [
      {
        url: '/og.png',
        width: 1734,
        height: 907,
        alt: '1-Monthon β',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '1-Monthon β',
    description: '過去の講習会と教材を見つけ、次の学びへつなぐ内部試用版',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
