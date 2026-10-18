"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LinkRecord } from "@/lib/types";
import { openInBrowser } from "@/lib/open-browser";
type GridSize = 1 | 4 | 9;

export default function RandomGrid({
  items,
  genre,
}: {
  items: LinkRecord[];
  genre?: string;
}) {
  const router = useRouter();
  const [gridSize, setGridSize] = useState<GridSize>(1);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("randomLinkGridSize");

    if (saved === "4") {
      setGridSize(4);
    } else if (saved === "9") {
      setGridSize(9);
    } else {
      setGridSize(1);
    }
  }, []);

  const changeGridSize = () => {
    const next: GridSize =
      gridSize === 1 ? 4 :
      gridSize === 4 ? 9 :
      1;

    setGridSize(next);
    localStorage.setItem("randomLinkGridSize", String(next));
  };

  const refresh = () => {
    const base = genre
      ? `/?genre=${encodeURIComponent(genre)}`
      : "/";

    const separator = genre ? "&" : "?";

    router.push(`${base}${separator}r=${Date.now()}`);
    router.refresh();
  };

  const visibleCount =
  gridSize === 1 ? 9 :
  gridSize === 4 ? 16 :
  30;

const visibleItems = items.slice(0, visibleCount);

  return (
    <>
      <div className="randomStage">
        
{visibleItems.length === 0 ? (
  <div className="emptyCard">
  <div className="panel empty">
  表示できるURLがまだありません。
</div>
</div>
) : (
<section className={`randomGrid grid${gridSize}`}>
    {visibleItems.map((item) => (
<a
  key={item.id}
  href={item.url}
  className="gridCard"
onClick={(e) => {
  e.preventDefault();
  if (editMode) {
    router.push(`/admin/${item.id}?from=home`);
    return;
  }
  if (item.url) {
    openInBrowser(item.url);
    return;
  }

  if (item.media_id != null) {
    router.push(`/media/${item.media_id}`);
  }
}}
>

<div className="gridThumbFrame">
  {item.thumbnail_url ? (
<img
  className="gridThumb"
  src={item.thumbnail_url}
  alt=""
  style={{
    objectFit: item.image_fit === "contain" ? "contain" : "cover",
  }}
/>
  ) : (
    <div className="gridNoThumb">NO IMAGE</div>
  )}
</div>
                <div className="gridCardBody">
                  
                  <div className="gridTitle">{item.title}</div>
                </div>
              </a>
            ))}
         </section>
      )}
        </div>
<button
  type="button"
  className={`gridEditButton ${editMode ? "active" : ""}`}
  onClick={() => setEditMode(!editMode)}
  aria-label={editMode ? "編集モードを終了" : "編集モードを開始"}
  title={editMode ? "編集モード終了" : "編集モード"}
>
  <svg
    width="25"
    height="25"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M16 5l3 3" />
    <path d="M9 15l-1 4 4-1L21 9a2.12 2.12 0 0 0-3-3z" />
  </svg>
</button>

<button
  className="gridRefreshButton"
  onClick={refresh}
  aria-label="別のページを表示"
>
  ↻ 別のページ
</button>

<button
  className="gridSwitchButton"
  onClick={changeGridSize}
  aria-label={`現在${gridSize}分割。表示数を変更`}
  title={`${gridSize}分割`}
>
  <span
    className={`gridSwitchIcon gridSwitchIcon${gridSize}`}
    aria-hidden="true"
  >
    {Array.from({ length: gridSize }, (_, index) => (
      <span key={index} />
    ))}
  </span>
</button>
    </>
  );
}