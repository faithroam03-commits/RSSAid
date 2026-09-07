"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AdminTable from "@/components/AdminTable";
import {
  deleteClientLink,
  getClientGenres,
  getClientLinks,
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
  
  return (
    <>
      <h1>URLメンテナンス</h1>

      <nav className="genreTabs">
        <Link
          href={makeHref()}
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

      <p className="small">
        現在 {links.length} 件登録されています。
      </p>

      <AdminTable
  links={links}
  onDelete={removeLink}
/>
    </>
  );
}