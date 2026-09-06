"use client";

import { useEffect, useState } from "react";
import {
  addClientLink,
  ensureDefaultGenre,
  getClientGenres,
  getClientLinks,
  insertClientLink,
} from "@/lib/client-db";

export default function IdbTestPage() {
  const [genres, setGenres] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<
  Awaited<ReturnType<typeof getClientLinks>>
>([]);

  useEffect(() => {
async function load() {
  try {
    await ensureDefaultGenre();

    const currentLinks = await getClientLinks();

    if (currentLinks.length === 0) {
      await addClientLink();
    }
    const hasRealTest = currentLinks.some(
  (item) => item.url === "https://example.org/"
);

if (!hasRealTest) {
  await insertClientLink({
    url: "https://example.org/",
    title: "実用登録テスト",
    genre: "New",
    imageFit: "contain",
  });
}

    const genreItems = await getClientGenres();
    const linkItems = await getClientLinks();

    setGenres(genreItems);
    setLinks(linkItems);
  } catch (e) {
    setError(
      e instanceof Error
        ? e.message
        : "IndexedDBの確認に失敗しました。"
    );
  }
}

    load();
  }, []);

  async function testDuplicate() {
  try {
    await insertClientLink({
      url: "https://example.org/",
      title: "重複登録テスト",
      genre: "New",
      imageFit: "contain",
    });

    alert("重複URLが登録されてしまいました。");
  } catch (e) {
    alert(
      e instanceof Error
        ? e.message
        : "重複チェックでエラーが発生しました。"
    );
  }
  }

  return (
    <main className="page">
      <h1>IndexedDBテスト</h1>

      {error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="panel">
          <p>保存されているジャンル:</p>
<p>保存されているURL:</p>

<ul>
  {links.map((item) => (
    <li key={item.id}>
      {item.title} - {item.url}
    </li>
  ))}
</ul>

          <button
  type="button"
  className="btn"
  onClick={testDuplicate}
>
  重複登録をテスト
</button>
          
          <ul>
            {genres.map((genre) => (
              <li key={genre}>{genre}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}