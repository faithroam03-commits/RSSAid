import "./globals.css";
import Menu from "@/components/Menu";
import type { ReactNode } from "react";

export const metadata = {
  title: "Random Link",
  description: "登録したURLをランダムに表示するリンクコレクション",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <header className="header">
          <Menu />

          <div className="brand" aria-label="Random Link">
            RandomLink
          </div>
        </header>

        <main className="container">{children}</main>
      </body>
    </html>
  );
}