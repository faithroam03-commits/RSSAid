"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RandomCard from "@/components/RandomCard";
import type { LinkRecord } from "@/lib/types";

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

  const visibleItems = items.slice(0, gridSize);

  return (
    <>
      {gridSize === 1 ? (
        <RandomCard item={visibleItems[0]} genre={genre} />
      ) : (
        <>
          <section className={`randomGrid grid${gridSize}`}>
            {visibleItems.map((item) => (
              <a
                key={item.id}
                href={item.url}
                className="gridCard"
                target="_blank"
                rel="noopener noreferrer"
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

          <button
            className="gridRefreshButton"
            onClick={refresh}
            aria-label="別のページを表示"
          >
            ↻
          </button>
        </>
      )}
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