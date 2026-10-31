"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function Menu() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const closeMenu = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  };

  useEffect(() => {
  const handlePointerDown = (event: PointerEvent) => {
    const details = detailsRef.current;

    if (
      details &&
      details.open &&
      !details.contains(event.target as Node)
    ) {
      details.open = false;
    }
  };

  document.addEventListener("pointerdown", handlePointerDown);

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown);
  };
}, []);

useEffect(() => {
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let startedInMenu = false;

  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      tracking = false;
      return;
    }

    const touch = event.touches[0];
    const details = detailsRef.current;

    if (!details) return;

    startX = touch.clientX;
    startY = touch.clientY;

    startedInMenu =
      details.open &&
      event.target instanceof Element &&
      !!event.target.closest(".menuPanel");

tracking = details.open
  ? startedInMenu
  : startX >= 24 && startX <= 120;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (!tracking) return;

    tracking = false;

    const touch = event.changedTouches[0];
    const details = detailsRef.current;

    if (!touch || !details) return;

    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    // 縦スクロールはスワイプ操作として扱わない。
    if (Math.abs(dy) > 45) return;

    if (!details.open && dx > 80) {
      details.open = true;
    } else if (details.open && startedInMenu && dx < -80) {
      details.open = false;
    }
  };

  const handleTouchCancel = () => {
    tracking = false;
  };

  document.addEventListener("touchstart", handleTouchStart, {
    passive: true,
  });
  document.addEventListener("touchend", handleTouchEnd, {
    passive: true,
  });
  document.addEventListener("touchcancel", handleTouchCancel);

  return () => {
    document.removeEventListener("touchstart", handleTouchStart);
    document.removeEventListener("touchend", handleTouchEnd);
    document.removeEventListener("touchcancel", handleTouchCancel);
  };
}, []);

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
  ＋ 新規登録
</Link>

        <Link href="/admin" onClick={closeMenu}>
          カードメンテナンス
        </Link>

        <Link href="/genres" onClick={closeMenu}>
          ジャンル管理
        </Link>
       
       <Link href="/backup" onClick={closeMenu}>
  バックアップ
</Link>

<Link href="/settings" onClick={closeMenu}>
  設定
</Link>

      </nav>
    </details>
  );
}