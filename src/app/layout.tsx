import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moth Flame — FLAME.EXE",
  description:
    "ドット絵の焚き火の周りを蛾になって飛び回れ。完璧な円を描いてスコアを競おう。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Press+Start+2P&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
