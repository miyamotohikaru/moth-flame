import type { Metadata } from "next";
import "./globals.css";

const TITLE = "Moth Flame — FLAME.EXE";
const DESCRIPTION =
  "ドット絵の焚き火の周りを蛾になって飛び回れ。完璧な円を描いてスコアを競おう。";

export const metadata: Metadata = {
  metadataBase: new URL("https://moth-flame.kosukuma.com"),
  title: TITLE,
  description: DESCRIPTION,
  // 共有したときに出る絵。実際のゲーム画面を撮ったもので、
  // 焼き直しは node tools/shoot-og.mjs（版下は tools/og.html）。
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://moth-flame.kosukuma.com",
    siteName: "Moth Flame",
    locale: "ja_JP",
    type: "website",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "MOTH & FLAME — 飛んで火に入る虫" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
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
