import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Random Link",
  description: "登録したURLをランダムに表示するリンクコレクション"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="header">
          <Link href="/" className="brand">Random Link</Link>
          <nav>
            <Link href="/register">登録</Link>
            <Link href="/genres">ジャンル</Link>
            <Link href="/admin">管理</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
