"use client";

import { useEffect, useState } from "react";
import {
  getClientGenres,
  getClientLinks,
} from "@/lib/client-db";
import { getDisplayImageUrl } from "@/lib/display-image-url";
import type { LinkRecord } from "@/lib/types";
import { useRouter } from "next/navigation";
import { openInBrowser } from "@/lib/open-browser";

const GENRE_STORAGE_KEY = "randomLinkSlideshowGenre";
const SPEED_STORAGE_KEY = "randomLinkSlideshowSpeed";
const MODE_STORAGE_KEY = "randomLinkSlideshowMode";

export default function SlideshowClient() {
const router = useRouter();

function openCurrentItem() {
  if (!currentItem) return;

  // カードを開く前に自動再生を停止する
  setIsPlaying(false);

  // スライドショーの表示状態を一時保存
  sessionStorage.setItem(
    "randomLinkSlideshowReturnState",
    JSON.stringify({
      genre: selectedGenre,
      mode: playbackMode,
      currentItemId: currentItem.id,
      historyIds: history.map((item) => item.id),
      historyIndex,
    })
  );

  if (currentItem.url) {
    openInBrowser(currentItem.url);
  } else if (currentItem.media_id != null) {
    router.push(`/media/${currentItem.media_id}`);
  }
}

  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("ALL");
  const [items, setItems] = useState<LinkRecord[]>([]);
  const [currentItem, setCurrentItem] =
    useState<LinkRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(5);
  const [playbackMode, setPlaybackMode] = useState<
  "random" | "newest"
>("random");
  const [history, setHistory] = useState<LinkRecord[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [genreList, links] = await Promise.all([
          getClientGenres(),
          getClientLinks(),
        ]);

        if (cancelled) return;

        const savedGenre =
          localStorage.getItem(GENRE_STORAGE_KEY);

const savedMode = localStorage.getItem(MODE_STORAGE_KEY);

setPlaybackMode(
  savedMode === "newest" ? "newest" : "random"
);

        setGenres(genreList);
        setItems(links);

        setSelectedGenre(
          savedGenre &&
          (savedGenre === "ALL" ||
            genreList.includes(savedGenre))
            ? savedGenre
            : "ALL"
        );
      } catch (error) {
        console.error(
          "スライドショーのデータ取得に失敗しました。",
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

useEffect(() => {
  if (loading) return;

const filtered = items.filter((item) =>
  selectedGenre === "ALL"
    ? (item.show_in_all ?? item.enabled) === 1
    : item.genre === selectedGenre &&
      (item.show_in_genre ?? item.enabled) === 1
);

  if (filtered.length === 0) {
    setCurrentItem(null);
    setHistory([]);
    setHistoryIndex(-1);
    return;
  }

  // カードを開く前の表示状態を復元
  const savedState = sessionStorage.getItem(
    "randomLinkSlideshowReturnState"
  );

if (savedState) {
  try {
      const saved = JSON.parse(savedState);

      if (
        saved.genre === selectedGenre &&
        saved.mode === playbackMode &&
        Array.isArray(saved.historyIds) &&
        Number.isInteger(saved.historyIndex)
      ) {
        const restoredHistory = saved.historyIds
          .map((id: number) =>
            filtered.find((item) => item.id === id)
          )
          .filter(
            (item: LinkRecord | undefined): item is LinkRecord =>
              item !== undefined
          );

        const index: number = saved.historyIndex;

        if (
          restoredHistory.length === saved.historyIds.length &&
          index >= 0 &&
          index < restoredHistory.length &&
          restoredHistory[index].id === saved.currentItemId
) {
  sessionStorage.removeItem(
    "randomLinkSlideshowReturnState"
  );

  setHistory(restoredHistory);
  setHistoryIndex(index);
  setCurrentItem(restoredHistory[index]);
  return;
        }
      }
    } catch (error) {
      console.error(
        "スライドショーの表示状態を復元できませんでした。",
        error
      );
    }
  }

  // 復元情報がなければ通常の初期表示
  let firstItem: LinkRecord;

  if (playbackMode === "newest") {
    const sorted = [...filtered].sort((a, b) => {
      const dateDiff =
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime();

      return dateDiff || b.id - a.id;
    });

    firstItem = sorted[0];
  } else {
    const index = Math.floor(
      Math.random() * filtered.length
    );

    firstItem = filtered[index];
  }

  setCurrentItem(firstItem);
  setHistory([firstItem]);
  setHistoryIndex(0);
}, [items, selectedGenre, playbackMode, loading]);
  function changeGenre(genre: string) {
    setSelectedGenre(genre);
    localStorage.setItem(GENRE_STORAGE_KEY, genre);
  }

function goNext() {
  // 戻った履歴がある場合は、その続きを表示
  if (historyIndex < history.length - 1) {
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setCurrentItem(history[nextIndex]);
    return;
  }

const filtered = items.filter((item) =>
  selectedGenre === "ALL"
    ? (item.show_in_all ?? item.enabled) === 1
    : item.genre === selectedGenre &&
      (item.show_in_genre ?? item.enabled) === 1
);

  if (filtered.length === 0) return;

  let nextItem: LinkRecord;

  if (playbackMode === "newest") {
    // 登録日時が新しい順に並べる
    const sorted = [...filtered].sort((a, b) => {
      const dateDiff =
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime();

      return dateDiff || b.id - a.id;
    });

    const currentIndex = sorted.findIndex(
      (item) => item.id === currentItem?.id
    );

    // 最後まで進んだら先頭に戻る
    const nextIndex =
      (currentIndex + 1) % sorted.length;

    nextItem = sorted[nextIndex];
  } else {
    // ランダムモード
    const candidates =
      filtered.length > 1
        ? filtered.filter(
            (item) => item.id !== currentItem?.id
          )
        : filtered;

    const index = Math.floor(
      Math.random() * candidates.length
    );

    nextItem = candidates[index];
  }

  setCurrentItem(nextItem);
  setHistory((prev) => [...prev, nextItem]);
  setHistoryIndex((prev) => prev + 1);
}

function goPrevious() {
  if (historyIndex <= 0) return;

  const previousIndex = historyIndex - 1;

  setHistoryIndex(previousIndex);
  setCurrentItem(history[previousIndex]);
}

function changePlaybackMode() {
  const nextMode =
    playbackMode === "random" ? "newest" : "random";

  setPlaybackMode(nextMode);
  localStorage.setItem(MODE_STORAGE_KEY, nextMode);
}

function changePlaybackSpeed() {
  const speeds = [3, 5, 10, 30];

  const currentIndex = speeds.indexOf(playbackSeconds);
  const nextSpeed =
    speeds[(currentIndex + 1) % speeds.length];

  setPlaybackSeconds(nextSpeed);
  localStorage.setItem(
    SPEED_STORAGE_KEY,
    String(nextSpeed)
  );
}

useEffect(() => {
  if (!isPlaying || !currentItem) return;

  const timer = window.setTimeout(() => {
    goNext();
}, playbackSeconds * 1000);

  return () => {
    window.clearTimeout(timer);
  };
}, [
  isPlaying,
  currentItem,
  historyIndex,
  history,
  items,
  selectedGenre,
  playbackSeconds,
]);

  if (loading) {
    return null;
  }

  return (
    <div
  className={`slideshowContent ${
    isFullscreen ? "slideshowFullscreen" : ""
  }`}
>
<nav
  className="genreTabs"
  aria-label="スライドショーのジャンル"
  style={{
    display: isFullscreen ? "none" : undefined,
  }}
>
        {["ALL", ...genres].map((genre) => (
          <button
            key={genre}
            type="button"
            className={`genreTab ${
              selectedGenre === genre ? "active" : ""
            }`}
            onClick={() => changeGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </nav>

      <div
        style={{
          marginTop: 20,
          height: "65dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
        }}
      >
{currentItem?.thumbnail_url ? (
  <button
    type="button"
    onClick={openCurrentItem}
    aria-label={`${currentItem.title}を開く`}
    style={{
      display: "block",
      width: "100%",
      padding: 0,
      border: "none",
      background: "transparent",
      cursor: "pointer",
    }}
  >
    <img
      src={getDisplayImageUrl(
        currentItem.thumbnail_url
      )}
      alt={currentItem.title}
      referrerPolicy="no-referrer"
      style={{
        display: "block",
        width: "100%",
        maxHeight: "65dvh",
        objectFit: "contain",
      }}
    />
  </button>
) : (
          <p style={{ color: "#aaa" }}>
            {currentItem
              ? "NO IMAGE"
              : "表示できるカードがありません。"}
          </p>
        )}
      </div>
<div
  className="slideshowControls"
  style={{
    display: "flex",
    justifyContent: "center",
    marginTop: 20,
  }}
>
<button
  type="button"
  onClick={goPrevious}
  disabled={historyIndex <= 0}
  aria-label="前の画像"
  style={{
    background: "#29292f",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 28px",
    fontSize: 24,
    cursor: historyIndex <= 0 ? "default" : "pointer",
    opacity: historyIndex <= 0 ? 0.4 : 1,
  }}
>
  ←
</button>

<button
  type="button"
  onClick={() => setIsPlaying((value) => !value)}
  disabled={!currentItem}
  aria-label={isPlaying ? "一時停止" : "再生"}
  style={{
    background: "#29292f",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 28px",
    fontSize: 24,
    cursor: currentItem ? "pointer" : "default",
    opacity: currentItem ? 1 : 0.4,
  }}
>

{isPlaying ? (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    style={{ display: "block", margin: "auto" }}
  >
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
) : (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    style={{ display: "block", margin: "auto" }}
  >
    <path d="M7 4.5L20 12L7 19.5Z" />
  </svg>
)}

</button>

  <button
    type="button"
    onClick={goNext}
    disabled={!currentItem}
    aria-label="次の画像"
    style={{
      background: "#29292f",
      color: "#fff",
      border: "none",
      borderRadius: 12,
      padding: "12px 28px",
      fontSize: 24,
      cursor: "pointer",
      }}
    >
      →
    </button>

<button
  type="button"
  onClick={changePlaybackMode}
  aria-label={
    playbackMode === "random"
      ? "ランダム表示中。タップで登録順に変更"
      : "登録順表示中。タップでランダムに変更"
  }
  title={playbackMode === "random" ? "ランダム" : "新着順"}
  style={{
    background: "#29292f",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 8px",
    width: 52,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
height: 48,
boxSizing: "border-box",
display: "flex",
alignItems: "center",
justifyContent: "center",
  }}
>
  {playbackMode === "random" ? (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ display: "block" }}
  >
    <path d="m18 14 4 4-4 4" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 18h2.5a6 6 0 0 0 5-3L14 9a6 6 0 0 1 5-3h3" />
    <path d="M2 6h2.5a6 6 0 0 1 5 3" />
    <path d="M14 15a6 6 0 0 0 5 3h3" />
  </svg>
) : (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ display: "block" }}
  >
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <path d="M3 5v14" />
    <path d="m1 17 2 2 2-2" />
  </svg>
)}
</button>

<button
  type="button"
  onClick={changePlaybackSpeed}
  aria-label={`再生速度 ${playbackSeconds}秒。タップで変更`}
  style={{
    background: "#29292f",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 10px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  }}
>
  {playbackSeconds}秒
</button>

<button
  type="button"
  onClick={() => {
  if (!currentItem) return;

  setIsPlaying(false);

  sessionStorage.setItem(
    "randomLinkSlideshowReturnState",
    JSON.stringify({
      genre: selectedGenre,
      mode: playbackMode,
      currentItemId: currentItem.id,
      historyIds: history.map((item) => item.id),
      historyIndex,
    })
  );

  router.push(
    `/admin/${currentItem.id}?from=slideshow`
  );
}}

  disabled={!currentItem}
  aria-label="表示中のカードを編集"
  title="カードを編集"
  style={{
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 46,
    height: 46,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    cursor: currentItem ? "pointer" : "default",
    opacity: currentItem ? 1 : 0.4,
  }}
>
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L9 17l-4 1 1-4Z" />
  </svg>
</button>

    <button
      type="button"
      onClick={() => setIsFullscreen((value) => !value)}
  aria-label={
    isFullscreen
      ? "フルスクリーンを解除"
      : "フルスクリーンにする"
  }
  style={{
    background: "#29292f",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 20px",
    fontSize: 22,
    cursor: "pointer",
  }}
>
  {isFullscreen ? "⛶" : "⛶"}
</button>
</div>
    </div>
  );
}