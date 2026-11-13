
"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import AdminTable from "@/components/AdminTable";
import {
  deleteClientLink,
  getClientGenres,
  getClientLinks,
  updateClientLink,
} from "@/lib/client-db";

import { downloadThumbnail } from "@/lib/download-thumbnail";
import { getDisplayImageUrl } from "@/lib/display-image-url";
import { getWritableDownloadFolder } from "@/lib/download-folder";
import {
  saveThumbnailHistory,
  getSavedThumbnailIds,
  clearSelectedThumbnailHistory,
} from "@/lib/thumbnail-history";

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
const [bulkMessage, setBulkMessage] = useState("");
const [bulkDownloading, setBulkDownloading] = useState(false);
const [bulkDownloadProgress, setBulkDownloadProgress] = useState({
  completed: 0,
  total: 0,
});
const [bulkDownloadSummary, setBulkDownloadSummary] = useState("");
const [bulkDownloadFailures, setBulkDownloadFailures] = useState<
  { id: number; title: string; error: string }[]
>([]);
const bulkDownloadRunning = useRef(false);
const bulkDownloadStopRequested = useRef(false);

useEffect(() => {
  setBulkMessage("");
}, [selectedGenre]);

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

async function selectUnsavedThumbnails() {
  if (bulkDownloading) return;

  try {
    const savedIds = new Set(
      await getSavedThumbnailIds()
    );

    const unsaved = links
      .filter((link) => !savedIds.has(link.id))
      .slice(0, 100);

    setSelectedIds(
      new Set(unsaved.map((link) => link.id))
    );

    if (unsaved.length === 0) {
      setBulkMessage(
        "現在表示されているカードに未保存の画像はありません。"
      );
    } else {
      setBulkMessage(
        `未保存のカードを${unsaved.length}件選択しました。`
      );
    }
  } catch (error) {
    setBulkMessage(
      `保存履歴の取得に失敗しました：${
        error instanceof Error
          ? error.message
          : "不明なエラー"
      }`
    );
  }
}

async function resetSelectedThumbnailHistory() {
  if (bulkDownloading || selectedIds.size === 0) {
    return;
  }

  try {
    const savedIds = new Set(
      await getSavedThumbnailIds()
    );

    const targetIds = [...selectedIds].filter(
      (id) => savedIds.has(id)
    );

    if (targetIds.length === 0) {
      setBulkMessage(
        "選択したカードに保存履歴はありません。"
      );
      return;
    }

    const confirmed = window.confirm(
      `選択したカードのうち、${targetIds.length}件の画像保存履歴を解除しますか？\n\n` +
      "端末に保存した画像ファイルは削除されません。"
    );

    if (!confirmed) return;

    await clearSelectedThumbnailHistory(targetIds);

    setBulkMessage(
      `${targetIds.length}件の画像保存履歴を解除しました。`
    );
  } catch (error) {
    setBulkMessage(
      `画像保存履歴の解除に失敗しました：${
        error instanceof Error
          ? error.message
          : "不明なエラー"
      }`
    );
  }
}

async function downloadSelectedImages() {
  if (bulkDownloadRunning.current) {
    return;
  }

  if (selectedIds.size === 0) {
    return;
  }

if (selectedIds.size > 100) {
  alert(
    "画像保存は一度に100件までです。\n" +
    "選択件数を減らしてください。"
  );
  return;
}

  const targets = allLinks.filter((link) =>
    selectedIds.has(link.id)
  );

  if (targets.length === 0) {
    return;
  }

  const confirmed = confirm(
    `選択した${targets.length}件の画像を保存しますか？\n\n` +
    "複数の画像を保存すると、端末のストレージ容量を消費します。\n" +
    "Chromeから複数ダウンロードの許可を求められる場合があります。"
  );

  if (!confirmed) {
    return;
  }

  try {
    await getWritableDownloadFolder();
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "保存先フォルダを確認できませんでした。"
    );
    return;
  }

  bulkDownloadRunning.current = true;
  bulkDownloadStopRequested.current = false;
  setBulkDownloading(true);

  setBulkDownloadSummary("");
  setBulkDownloadFailures([]);
  setBulkDownloadProgress({
    completed: 0,
    total: targets.length,
  });

let requested = 0;
let folderSaved = 0;
let failed = 0;
  let completed = 0;
  let stopped = false;

  const failedLinks: {
  id: number;
  title: string;
  error: string;
  }[] = [];

  try {
    for (let i = 0; i < targets.length; i++) {
    if (bulkDownloadStopRequested.current) {
    stopped = true;
    break;
    }

  const link = targets[i];

const result = await downloadThumbnail(
  getDisplayImageUrl(link.thumbnail_url),
  link.title,
  link.id,
  undefined,
  selectedGenre || "ALL"
);

if (result.ok) {
  requested++;

  if (result.saveMethod === "folder") {
    folderSaved++;
  }

  try {
    await saveThumbnailHistory(
      link.id,
      `RL_${selectedGenre || "ALL"}_ID${link.id}`
    );
  } catch (error) {
    console.error(
      "画像保存履歴の記録に失敗しました:",
      link.id,
      error
    );
  }
} else {
  failed++;

  failedLinks.push({
    id: link.id,
    title: link.title,
    error: result.error,
  });
}

completed = i + 1;

setBulkDownloadProgress({
  completed: i + 1,
  total: targets.length,
});
    }

if (stopped) {
  const remaining = targets.slice(completed);

  setSelectedIds(
    new Set(remaining.map((link) => link.id))
  );

  setBulkDownloadSummary(
    `保存を中断しました。` +
    `処理済み：${completed}件 / ` +
`フォルダ保存完了：${folderSaved}件 / ` +
`取得成功：${requested}件 / ` +
    `取得失敗：${failed}件 / ` +
    `未処理：${remaining.length}件（自動選択済み）`
  );
} else {
  setBulkDownloadSummary(
`フォルダ保存完了：${folderSaved}件 / ` +
`取得成功：${requested}件 / ` +
    `取得失敗：${failed}件`
  );
}

setBulkDownloadFailures(failedLinks);

  } catch (error) {
    setBulkDownloadSummary(
      "画像保存処理を中断しました：" +
      (error instanceof Error
        ? error.message
        : "不明なエラー")
    );
  } finally {
    bulkDownloadRunning.current = false;
    setBulkDownloading(false);
  }
}

async function moveSelectedLinks() {
  if (!bulkGenre || selectedIds.size === 0) {
    return;
  }

  const movedCount = selectedIds.size;
  setBulkMessage("");

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
    setBulkMessage(`${movedCount}件のジャンルを変更しました。`);
  } catch {
    setBulkMessage("");
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
      <h1>カードメンテナンス</h1>

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

    {/* カード管理 */}
    <section style={{ marginBottom: 24 }}>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>
        カード管理
      </h3>

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

      <div className="actions" style={{ marginTop: 12 }}>
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
          disabled={!bulkGenre || selectedIds.size === 0}
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
    </section>

    <hr
      style={{
        border: 0,
        borderTop: "1px solid #d1d5db",
        margin: "20px 0",
      }}
    />

    {/* 画像の一括保存 */}
    <section>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>
        画像の一括保存
      </h3>

      <div className="actions">
        <button
          type="button"
          className="btn"
          onClick={selectUnsavedThumbnails}
          disabled={!links.length || bulkDownloading}
        >
          未保存を100件選択
        </button>

        <button
          type="button"
          className="btn"
          onClick={downloadSelectedImages}
          disabled={
            selectedIds.size === 0 || bulkDownloading
          }
        >
          {bulkDownloading ? "画像保存中..." : "画像保存"}
        </button>
<button
  type="button"
  className="btn danger"
  onClick={resetSelectedThumbnailHistory}
  disabled={
    selectedIds.size === 0 || bulkDownloading
  }
>
  選択カードの保存履歴を解除
</button>
      </div>
    </section>

    {bulkDownloading && (
      <p role="status" className="small">
        画像保存中：
        {bulkDownloadProgress.completed} /
        {bulkDownloadProgress.total} 件
      </p>
    )}

    {bulkDownloadSummary && (
      <p role="status" className="small">
        {bulkDownloadSummary}
      </p>
    )}

{bulkDownloadFailures.length > 0 && (
  <details style={{ marginTop: 12 }}>
    <summary
      style={{
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      保存失敗したカード
      （{bulkDownloadFailures.length}件）
    </summary>

<button
  type="button"
  className="btn"
  style={{ marginTop: 12 }}
  disabled={bulkDownloading}
  onClick={() => {
    setSelectedIds(
      new Set(
        bulkDownloadFailures.map((item) => item.id)
      )
    );
  }}
>
  失敗したカードだけ選択
</button>

    <ul style={{ paddingLeft: 20 }}>
      {bulkDownloadFailures.map((failedLink) => (
        <li
          key={failedLink.id}
          style={{ marginTop: 12 }}
        >
<Link
  href={
    selectedGenre
      ? `/admin/${failedLink.id}?genre=${encodeURIComponent(selectedGenre)}`
      : `/admin/${failedLink.id}`
  }
  style={{
    color: "#2563eb",
    textDecoration: "underline",
    fontWeight: 600,
  }}
>
  {failedLink.title}
</Link>

          <div className="small">
            カードID：{failedLink.id}
          </div>

          <div className="small">
            {failedLink.error}
          </div>
        </li>
      ))}
    </ul>
  </details>
)}

    {bulkMessage && (
      <p
        role="status"
        style={{
          marginTop: 16,
          marginBottom: 0,
          color: "#16803c",
          fontWeight: 600,
        }}
      >
        ✓ {bulkMessage}
      </p>
    )}
  </div>
)}

<AdminTable
  links={links}
  selectedGenre={selectedGenre}
  onDelete={removeLink}
  bulkMode={bulkMode}
  selectedIds={selectedIds}
  onToggleSelected={toggleSelected}
/>

{bulkMode && bulkDownloading && (
  <button
    type="button"
    onClick={() => {
      bulkDownloadStopRequested.current = true;
    }}
    style={{
      position: "fixed",
      right: "16px",
      bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
      zIndex: 1000,
      padding: "12px 18px",
      backgroundColor: "#b91c1c",
      color: "#ffffff",
      border: "1px solid #991b1b",
      borderRadius: "999px",
      fontSize: "14px",
      fontWeight: 700,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      cursor: "pointer",
    }}
  >
    保存を中断
  </button>
)}

    </>
  );
}