"use client";

import { useEffect, useState } from "react";
import {
  addClientLink,
  deleteClientGenre,
  deleteClientLink,
  ensureDefaultGenre,
  getClientGenres,
  getClientLinks,
  insertClientGenre,
  insertClientLink,
  moveClientGenre,
  updateClientLink,
  getRandomClientLinks,
} from "@/lib/client-db";

export default function IdbTestPage() {
  const [genres, setGenres] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<
  Awaited<ReturnType<typeof getClientLinks>>
>([]);
  const [randomLinks, setRandomLinks] = useState<
  Awaited<ReturnType<typeof getRandomClientLinks>>
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
const randomItems = await getRandomClientLinks(2);

setGenres(genreItems);
setLinks(linkItems);
setRandomLinks(randomItems);
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

  async function testAddGenre() {
  try {
    await insertClientGenre("テストジャンル");

    const genreItems = await getClientGenres();
    setGenres(genreItems);

    alert("ジャンルを追加しました。");
  } catch (e) {
    alert(
      e instanceof Error
        ? e.message
        : "ジャンル追加でエラーが発生しました。"
    );
  }
  }

  async function testUpdateLink() {
  try {
    const linkItems = await getClientLinks();

    const target = linkItems.find(
      (item) => item.url === "https://example.org/"
    );

    if (!target) {
      alert("更新対象が見つかりません。");
      return;
    }

    await updateClientLink(target.id, {
      title: "更新済みテスト",
    });

    setLinks(await getClientLinks());

    alert("URL情報を更新しました。");
  } catch (e) {
    alert(
      e instanceof Error
        ? e.message
        : "更新テストでエラーが発生しました。"
    );
  }
}

async function testDeleteLink() {
  try {
    const linkItems = await getClientLinks();

    const target = linkItems.find(
      (item) => item.url === "https://example.org/"
    );

    if (!target) {
      alert("削除対象が見つかりません。");
      return;
    }

    await deleteClientLink(target.id);

    setLinks(await getClientLinks());

    alert("URLを削除しました。");
  } catch (e) {
    alert(
      e instanceof Error
        ? e.message
        : "削除テストでエラーが発生しました。"
    );
  }
}
  async function testDeleteGenre() {
  try {
    await deleteClientGenre("テストジャンル");

const genreItems = await getClientGenres();
const linkItems = await getClientLinks();
const randomItems = await getRandomClientLinks(2);

setGenres(genreItems);
setLinks(linkItems);
setRandomLinks(randomItems);

    alert("ジャンルを削除しました。");
  } catch (e) {
    alert(
      e instanceof Error
        ? e.message
        : "ジャンル削除でエラーが発生しました。"
    );
  }
  }
  
  async function testGenreMigration() {
  try {
    await insertClientGenre("テストジャンル");

    const linkItems = await getClientLinks();

    const target = linkItems.find(
      (item) => item.url === "https://example.org/"
    );

    if (!target) {
      alert("移動対象のURLが見つかりません。");
      return;
    }

    await updateClientLink(target.id, {
      genre: "テストジャンル",
    });

    await deleteClientGenre("テストジャンル");

    const updatedLinks = await getClientLinks();
    const updatedTarget = updatedLinks.find(
      (item) => item.id === target.id
    );

    setGenres(await getClientGenres());
    setLinks(updatedLinks);

    alert(
      updatedTarget?.genre === "New"
        ? "Newへの移動に成功しました。"
        : "Newへの移動を確認できませんでした。"
    );
  } catch (e) {
    alert(
      e instanceof Error
        ? e.message
        : "ジャンル移動テストでエラーが発生しました。"
    );
  }
  }

  async function testGenreMove() {
  try {
    await insertClientGenre("ジャンルA");
    await insertClientGenre("ジャンルB");

    await moveClientGenre("ジャンルB", "up");

    const genreItems = await getClientGenres();
    setGenres(genreItems);

    alert("ジャンルBを上へ移動しました。");
  } catch (e) {
    alert(
      e instanceof Error
        ? e.message
        : "ジャンル並べ替えでエラーが発生しました。"
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

             <p>ランダム取得:</p>

<ul>
  {randomLinks.map((item) => (
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

          <button
  type="button"
  className="btn"
  onClick={testAddGenre}
>
  ジャンル追加をテスト
</button>

          <button
  type="button"
  className="btn"
  onClick={testUpdateLink}
>
  URL更新をテスト
</button>

<button
  type="button"
  className="btn"
  onClick={testDeleteLink}
>
  URL削除をテスト
</button>

          <button
  type="button"
  className="btn"
  onClick={testDeleteGenre}
>
  ジャンル削除をテスト
</button>
          
 <button
  type="button"
  className="btn"
  onClick={testGenreMigration}
>
  ジャンル削除時の移動をテスト
</button>

          <button
  type="button"
  className="btn"
  onClick={testGenreMove}
>
  ジャンル並べ替えをテスト
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