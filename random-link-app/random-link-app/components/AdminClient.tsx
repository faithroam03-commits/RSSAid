"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AdminTable from "@/components/AdminTable";
import {
  deleteClientLink,
  getClientGenres,
  getClientLinks,
  updateClientLink,
} from "@/lib/client-db";

type Props = {
  selectedGenre?: string;
  query: string;
  sort: string;
  status: string;
};

export default function AdminClient({
  selectedGenre,
  query,
  sort,
  status,
}: Props) {
  const [genres, setGenres] = useState<string[]>([]);
  const [allLinks, setAllLinks] = useState<
    Awaited<ReturnType<typeof getClientLinks>>
  >([]);
  const [loading, setLoading] = useState(true);
const [bulkMode, setBulkMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
const [bulkGenre, setBulkGenre] = useState("");

  useEffect(() => {
    async function load() {
      const genreItems = await getClientGenres();
      const linkItems = await getClientLinks();

      setGenres(genreItems);
      setAllLinks(linkItems);
      setLoading(false);
    }

    load();
  }, []);

  const genreLinks = selectedGenre
    ? allLinks.filter(
        (link) => link.genre === selectedGenre
      )
    : allLinks;

  const filteredLinks = query
    ? genreLinks.filter((link) => {
        const keyword = query.toLowerCase();
      
        return (
          link.title.toLowerCase().includes(keyword) ||
          link.url.toLowerCase().includes(keyword)
        );
      })
    : genreLinks;

  const statusLinks = filteredLinks.filter((link) => {
    if (status === "enabled") {
      return Boolean(link.enabled);
    }

    if (status === "disabled") {
      return !link.enabled;
    }

    return true;
  });

  const links = [...statusLinks].sort((a, b) => {
    if (sort === "oldest") {
      return (
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
      );
    }

    if (sort === "title") {
      return a.title.localeCompare(
        b.title,
        "ja"
      );
    }

    return (
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
    );
  });

  function makeHref(genre?: string) {
    const search = new URLSearchParams();

    if (genre) {
      search.set("genre", genre);
    }

    if (query) {
      search.set("q", query);
    }

    if (sort !== "newest") {
      search.set("sort", sort);
    }

    if (status !== "all") {
      search.set("status", status);
    }

    const value = search.toString();

    return value
      ? `/admin?${value}`
      : "/admin";
  }

  if (loading) {
    return null;
  }

        async function removeLink(id: number) {
  await deleteClientLink(id);

  setAllLinks((current) =>
    current.filter((item) => item.id !== id)
  );
        }

function toggleBulkMode() {
  setBulkMode((current) => {
    if (current) {
      setSelectedIds(new Set());
      setBulkGenre("");
    }

    return !current;
  });
}

function closeBulkMode() {
  setBulkMode(false);
  setSelectedIds(new Set());
  setBulkGenre("");
}

function toggleSelected(id: number) {
  setSelectedIds((current) => {
    const next = new Set(current);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    return next;
  });
}

function toggleAllVisible() {
  const visibleIds = links.map((item) => item.id);
  const allSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.has(id));

  setSelectedIds((current) => {
    const next = new Set(current);

    if (allSelected) {
      visibleIds.forEach((id) => next.delete(id));
    } else {
      visibleIds.forEach((id) => next.add(id));
    }

    return next;
  });
}

async function moveSelectedLinks() {
  if (!bulkGenre || selectedIds.size === 0) {
    return;
  }

  try {
    await Promise.all(
      [...selectedIds].map((id) =>
        updateClientLink(id, { genre: bulkGenre })
      )
    );

    setAllLinks((current) =>
      current.map((item) =>
        selectedIds.has(item.id)
          ? { ...item, genre: bulkGenre }
          : item
      )
    );

    setSelectedIds(new Set());
    setBulkGenre("");
  } catch {
    alert("ジャンル移動に失敗しました。");
  }
}

async function deleteSelectedLinks() {
  if (selectedIds.size === 0) {
    return;
  }

  if (
    !confirm(
      `選択した${selectedIds.size}件を削除しますか？`
    )
  ) {
    return;
  }

  try {
    await Promise.all(
      [...selectedIds].map((id) =>
        deleteClientLink(id)
      )
    );

    setAllLinks((current) =>
      current.filter(
        (item) => !selectedIds.has(item.id)
      )
    );

    setSelectedIds(new Set());
  } catch {
    alert("一括削除に失敗しました。");
  }
}
  
  return (
    <>
      <h1>URLメンテナンス</h1>

      <nav className="genreTabs">
<Link
  href={makeHref()}
  onClick={closeBulkMode}
  className={`genreTab ${
    !selectedGenre ? "active" : ""
  }`}
>
          ALL
        </Link>

        {genres.map((genre) => (
<Link
  key={genre}
  href={makeHref(genre)}
  onClick={closeBulkMode}
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

      <form
        action="/admin"
        method="get"
        className="adminSearch"
      >
        {selectedGenre && (
          <input
            type="hidden"
            name="genre"
            value={selectedGenre}
          />
        )}

        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="タイトル・URLを検索"
        />

        <button
          type="submit"
          className="btn"
        >
          検索
        </button>

        {query && (
          <Link
            href={
              selectedGenre
                ? `/admin?genre=${encodeURIComponent(
                    selectedGenre
                  )}`
                : "/admin"
            }
            className="btn"
          >
            解除
          </Link>
        )}
      </form>

      <form
        action="/admin"
        method="get"
        className="adminFilters"
      >
        {selectedGenre && (
          <input
            type="hidden"
            name="genre"
            value={selectedGenre}
          />
        )}

        {query && (
          <input
            type="hidden"
            name="q"
            value={query}
          />
        )}

        <div className="adminFilterItem">
          <label>
            並び順
            <select
              name="sort"
              defaultValue={sort}
            >
              <option value="newest">
                新しい順
              </option>
              <option value="oldest">
                古い順
              </option>
              <option value="title">
                タイトル順
              </option>
            </select>
          </label>
        </div>

        <div className="adminFilterItem">
          <label>
            状態
            <select
              name="status"
              defaultValue={status}
            >
              <option value="all">
                すべて
              </option>
              <option value="enabled">
                有効のみ
              </option>
              <option value="disabled">
                無効のみ
              </option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          className="btn adminFilterApply"
        >
          適用
        </button>
      </form>

<div className="adminBulkHeader">
  <p className="small">
    現在 {links.length} 件登録されています。
  </p>

  <button
    type="button"
    className="btn adminBulkToggle"
    onClick={toggleBulkMode}
  >
    一括操作
  </button>
</div>

      {bulkMode && (
  <div className="panel adminBulkPanel">
    <div className="adminBulkRow">
      <button
        type="button"
        className="btn"
        onClick={toggleAllVisible}
        disabled={!links.length}
      >
        ☑ すべて選択
      </button>

      <span className="small">
        {selectedIds.size}件選択中
      </span>
    </div>

    <div className="actions">
      <select
        value={bulkGenre}
        onChange={(event) =>
          setBulkGenre(event.target.value)
        }
      >
        <option value="">移動先ジャンル</option>

        {genres.map((genre) => (
          <option key={genre} value={genre}>
            {genre}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="btn"
        onClick={moveSelectedLinks}
        disabled={
          !bulkGenre || selectedIds.size === 0
        }
      >
        ジャンル移動
      </button>

      <button
        type="button"
        className="btn danger"
        onClick={deleteSelectedLinks}
        disabled={selectedIds.size === 0}
      >
        削除
      </button>
    </div>
  </div>
)}

<AdminTable
  links={links}
  onDelete={removeLink}
  bulkMode={bulkMode}
  selectedIds={selectedIds}
  onToggleSelected={toggleSelected}
/>
    </>
  );
}