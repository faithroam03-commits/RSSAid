"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import RandomGrid from "@/components/RandomGrid";
import {
  getClientGenres,
  getRandomClientLinks,
} from "@/lib/client-db";

type Props = {
  selectedGenre?: string;
};

export default function HomeClient({
  selectedGenre,
}: Props) {
  const [genres, setGenres] = useState<string[]>([]);
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof getRandomClientLinks>>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const genreItems = await getClientGenres();
      const randomItems = await getRandomClientLinks(
        30,
        selectedGenre
      );

      setGenres(genreItems);
      setItems(randomItems);
      setLoading(false);
    }

    load();
  }, [selectedGenre]);

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