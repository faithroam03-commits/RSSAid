"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import RandomGrid from "@/components/RandomGrid";
import {
  getClientGenres,
  getRandomClientLinks,
  getClientLinks,
} from "@/lib/client-db";

type Props = {
  selectedGenre?: string;
  refreshKey?: string;
};

export default function HomeClient({
  selectedGenre,
  refreshKey,
}: Props) {
  const [genres, setGenres] = useState<string[]>([]);
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof getRandomClientLinks>>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const genreItems = await getClientGenres();
      let randomItems = await getRandomClientLinks(
  30,
  selectedGenre
);

const savedOrder = sessionStorage.getItem(
  "randomLinkHomeCardOrder"
);

if (savedOrder) {
  sessionStorage.removeItem("randomLinkHomeCardOrder");

  try {
    const saved = JSON.parse(savedOrder) as {
      genre: string | null;
      ids: number[];
    };

    if (
      saved.genre === (selectedGenre ?? null) &&
      Array.isArray(saved.ids)
    ) {
      const allLinks = await getClientLinks();
      const linkMap = new Map(
        allLinks
          .filter(
            (link) =>
              link.enabled === 1 &&
              (!selectedGenre || link.genre === selectedGenre)
          )
          .map((link) => [link.id, link])
      );

      randomItems = saved.ids
        .map((id) => linkMap.get(id))
        .filter((link) => link !== undefined);
    }
  } catch {
    // 保存情報が不正な場合は通常のランダム表示を使用
  }
}

      setGenres(genreItems);
      setItems(randomItems);
      setLoading(false);
    }

    load();
}, [selectedGenre, refreshKey]);

  if (loading) {
    return null;
  }

  return (
    <>
      <nav className="genreTabs">
        <Link
          href="/"
          className={`genreTab ${
            !selectedGenre ? "active" : ""
          }`}
        >
          ALL
        </Link>

        {genres.map((genre) => (
          <Link
            key={genre}
            href={`/?genre=${encodeURIComponent(
              genre
            )}`}
            className={`genreTab ${
              selectedGenre === genre
                ? "active"
                : ""
            }`}
          >
            {genre}
          </Link>
        ))}
      </nav>

      <RandomGrid
        items={items}
        genre={selectedGenre}
      />
    </>
  );
}