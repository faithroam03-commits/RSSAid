"use client";

import Link from "next/link";
import { useRef } from "react";

export default function Menu() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const closeMenu = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  };

  return (
    <details ref={detailsRef} className="menu">
      <summary className="menuButton" aria-label="メニューを開く">
        ☰
      </summary>

     <nav className="menuPanel">

      <Link href="/" onClick={closeMenu}>
       トップ
      </Link>
      
        <Link href="/register" onClick={closeMenu}>
          ＋ 登録
        </Link>

        <Link href="/admin" onClick={closeMenu}>
          URL管理
        </Link>

        <Link href="/genres" onClick={closeMenu}>
          ジャンル管理
        </Link>
      </nav>
    </details>
  );
}