"use client";

import { useEffect, useState } from "react";

import GenresManager from "@/components/GenresManager";
import { getClientGenres } from "@/lib/client-db";

export default function GenresPageClient() {
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const genreItems = await getClientGenres();

      setGenres(genreItems);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <>
      <h1>ジャンル管理</h1>
      <GenresManager genres={genres} />
    </>
  );
}