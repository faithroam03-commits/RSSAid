"use client";

import {
  exportClientGenre,
  getClientGenreRecords,
  getClientLinks,
  importClientBackup,
  importClientSharedGenre,
  type ClientBackupData,
  type ClientSharedGenreData,
} from "@/lib/client-db";

import { useEffect, useState } from "react";

export default function BackupPage() {
  
const [importData, setImportData] = useState<ClientBackupData | null>(null);
const [importError, setImportError] = useState("");

const [importResult, setImportResult] = useState("");
const [importing, setImporting] = useState(false);
const [shareGenre, setShareGenre] = useState("");
const [shareGenres, setShareGenres] = useState<string[]>([]);

const [sharedImportData, setSharedImportData] =
  useState<ClientSharedGenreData | null>(null);

const [sharedImportGenreName, setSharedImportGenreName] =
  useState("");

const [sharedImportError, setSharedImportError] =
  useState("");

  const [sharedImportResult, setSharedImportResult] = useState("");
const [sharedImporting, setSharedImporting] = useState(false);

type SharedContentCheckResult = {
  id: number;
  r18: boolean;
  violent: boolean;
  bug: boolean;
};

type PendingSharedImport = {
  targetGenre: string;
  safeUrls: string[];
  blockedCount: number;
  contentResults: SharedContentCheckResult[];
  r18Count: number;
  violenceCount: number;
  bugCount: number;
};

const [pendingSharedImport, setPendingSharedImport] =
  useState<PendingSharedImport | null>(null);

  
useEffect(() => {
  async function loadShareGenres() {
    const records = await getClientGenreRecords();

    const names = records
      .sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          a.id - b.id
      )
      .map((item) => item.name);

    setShareGenres(names);

    if (names.length > 0) {
      setShareGenre(names[0]);
    }
  }

  loadShareGenres();
}, []);

async function runImport() {
  if (!importData || importing) {
    return;
  }

  const ok = window.confirm(
    `リンク ${importData.links.length}件、ジャンル ${importData.genres.length}件を追加インポートします。\n\n既存データは削除されません。`
  );

  if (!ok) {
    return;
  }

  setImporting(true);
  setImportResult("");
  setImportError("");

  try {
    const result = await importClientBackup(importData);

    setImportResult(
  `インポート完了：リンク ${result.addedLinks}件、ジャンル ${result.addedGenres}件を追加しました。トップページやジャンル管理で内容を確認してください。`
);
  } catch (error) {
    console.error(error);
    setImportError("インポートに失敗しました。");
  } finally {
    setImporting(false);
  }
}

  async function exportSharedGenre() {
  if (!shareGenre) {
    return;
  }

  const data = await exportClientGenre(shareGenre);

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  const safeGenreName = shareGenre
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();

  const date = new Date()
    .toISOString()
    .slice(0, 10);

  a.href = url;
  a.download = `random-link-genre-${safeGenreName}-${date}.json`;
  a.click();

  URL.revokeObjectURL(url);
  }
  
  async function exportBackup() {
    const links = await getClientLinks();
    const genres = await getClientGenreRecords();

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      links,
      genres,
    };

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const date = new Date()
      .toISOString()
      .slice(0, 10);

    a.href = url;
    a.download = `random-link-backup-${date}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  async function selectSharedImportFile(
  event: React.ChangeEvent<HTMLInputElement>
) {
  setSharedImportError("");
  setSharedImportData(null);
  setSharedImportGenreName("");

  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text) as ClientSharedGenreData;

    if (
      data.version !== 1 ||
      typeof data.genreName !== "string" ||
      !data.genreName.trim() ||
      !Array.isArray(data.links)
    ) {
      throw new Error();
    }

    setSharedImportData(data);
    setSharedImportGenreName(data.genreName.trim());
  } catch {
    setSharedImportError(
      "共有ジャンルファイルを読み込めませんでした。"
    );
  }
  }

   async function runSharedImport() {
    if (!sharedImportData) {
      return;
    }

    const targetGenre = sharedImportGenreName.trim();

    if (!targetGenre) {
      setSharedImportError("取り込み先ジャンル名を入力してください。");
      return;
    }

    setSharedImporting(true);
    setSharedImportError("");
    setSharedImportResult("");

    try {
      const urls = sharedImportData.links.map((link) => link.url);

      const res = await fetch("/api/check-urls", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ urls }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "URLの安全性を確認できませんでした。");
      }

      if (!Array.isArray(data.results)) {
        throw new Error("URLの安全性確認結果が不正です。");
      }

      const safeUrls = data.results
        .filter((result: { url: string; safe: boolean }) => result.safe)
        .map((result: { url: string; safe: boolean }) => result.url);

      const blockedCount = sharedImportData.links.length - safeUrls.length;

      const safeUrlSet = new Set(safeUrls);

      const contentItems = sharedImportData.links
        .map((link, index) => ({
          link,
          index,
        }))
        .filter(
          ({ link }) =>
            safeUrlSet.has(link.url) &&
            typeof link.thumbnail_url === "string" &&
            link.thumbnail_url.trim(),
        )
        .map(({ link, index }) => ({
          id: index,
          imageUrl: link.thumbnail_url!.trim(),
        }));

let contentResults: SharedContentCheckResult[] = [];
let r18Count = 0;
let violenceCount = 0;
let bugCount = 0;

      if (contentItems.length > 0) {
        const contentRes = await fetch("/api/check-content", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            items: contentItems,
          }),
        });

        const contentData = await contentRes.json();

        if (!contentRes.ok) {
          throw new Error(
            contentData.error || "コンテンツの安全性を確認できませんでした。",
          );
        }

        if (!Array.isArray(contentData.results)) {
          throw new Error("コンテンツの安全性確認結果が不正です。");
        }

contentResults = contentData.results;
r18Count = contentData.r18Count ?? 0;
violenceCount = contentData.violenceCount ?? 0;
bugCount = contentData.bugCount ?? 0;
      }

if (r18Count > 0 || violenceCount > 0 || bugCount > 0) {
  setPendingSharedImport({
    targetGenre,
    safeUrls,
    blockedCount,
    contentResults,
    r18Count,
    violenceCount,
    bugCount,
  });

  return;
}

      const result = await importClientSharedGenre(
        sharedImportData,
        targetGenre,
        safeUrls,
      );

      setSharedImportResult(
        `${result.addedLinks}件取り込み、${blockedCount}件ブロックしました。`,
      );

      const records = await getClientGenreRecords();

      setShareGenres(
        records
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((record) => record.name),
      );

      setSharedImportData(null);
      setSharedImportGenreName("");
    } catch (e) {
      setSharedImportError(
        e instanceof Error
          ? e.message
          : "共有ジャンルの取り込みに失敗しました。",
      );
    } finally {
      setSharedImporting(false);
    }
  }

  async function finishSharedImport(excludeFlagged: boolean) {
    if (!sharedImportData || !pendingSharedImport) {
      return;
    }

    setSharedImporting(true);
    setSharedImportError("");
    setSharedImportResult("");

    try {
const excludedIndexes = excludeFlagged
  ? pendingSharedImport.contentResults
      .filter((item) => item.r18 || item.violent || item.bug)
      .map((item) => item.id)
  : [];

const targetGenre = sharedImportGenreName.trim();

if (!targetGenre) {
  throw new Error("取り込み先ジャンル名を入力してください。");
}

const result = await importClientSharedGenre(
  sharedImportData,
  targetGenre,
  pendingSharedImport.safeUrls,
  excludedIndexes,
);
      

      const contentBlockedCount = excludedIndexes.length;

      setSharedImportResult(
        `${result.addedLinks}件取り込み、` +
          `${pendingSharedImport.blockedCount}件をWeb Riskでブロック、` +
          `${contentBlockedCount}件を有害コンテンツ判定で除外しました。`,
      );

      const records = await getClientGenreRecords();

      setShareGenres(
        records
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((record) => record.name),
      );

      setPendingSharedImport(null);
      setSharedImportData(null);
      setSharedImportGenreName("");
    } catch (e) {
      setSharedImportError(
        e instanceof Error
          ? e.message
          : "共有ジャンルの取り込みに失敗しました。",
      );
    } finally {
      setSharedImporting(false);
    }
  }

  function cancelSharedImport() {
    setPendingSharedImport(null);
    setSharedImportError("");
  }
  
  async function selectImportFile(
  event: React.ChangeEvent<HTMLInputElement>
) {
  setImportError("");
  setImportData(null);

  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  try {
    const text = await file.text();
const data = JSON.parse(text) as ClientBackupData & {
  genreName?: unknown;
};

if (
  data.version === 1 &&
  typeof data.genreName === "string" &&
  Array.isArray(data.links) &&
  !Array.isArray(data.genres)
) {
  setImportError(
    "これは共有ジャンルファイルです。「共有ジャンルを取り込む」から選択してください。"
  );
  return;
}

if (
  data.version !== 1 ||
  !Array.isArray(data.links) ||
  !Array.isArray(data.genres)
) {
  throw new Error();
}

    setImportData(data);
  } catch {
    setImportError(
      "バックアップファイルを読み込めませんでした。"
    );
  }
  }
  return (
    <main>
      <h1>バックアップ</h1>

      <p>
        登録データのエクスポート・インポートを行います。
      </p>

      <div className="panel" style={{ marginTop: 24 }}>

        <div className="panel" style={{ marginTop: 24 }}>
  <h2>インポート</h2>

  <p>
    Random LinkのバックアップJSONファイルを選択します。
  </p>

  <input
    type="file"
    accept="application/json,.json"
    onChange={selectImportFile}
  />

  {importError && (
    <div className="error" style={{ marginTop: 12 }}>
      {importError}
    </div>
  )}

{importData && (
  <div style={{ marginTop: 16 }}>
    <div>
      リンク：{importData.links.length}件
    </div>
    <div>
      ジャンル：{importData.genres.length}件
    </div>

    <button
      type="button"
      className="btn primary"
      onClick={runImport}
      disabled={importing}
      style={{ marginTop: 16 }}
    >
      {importing
        ? "インポート中..."
        : "インポートを実行"}
    </button>
  </div>
)}

{importResult && (
  <div
    style={{
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      background: "#eefaf0",
      border: "1px solid #b7dfbf",
      fontWeight: 700,
    }}
  >
    {importResult}
  </div>
)}
          
</div>

<div className="panel" style={{ marginTop: 24 }}>
  <h2>共有ジャンルを取り込む</h2>

  <p>
    Random Linkの共有ジャンルJSONファイルを選択します。
  </p>

  <input
    type="file"
    accept="application/json,.json"
    onChange={selectSharedImportFile}
  />

  {sharedImportGenreName.trim() &&
  shareGenres.includes(sharedImportGenreName.trim()) && (
    <div className="error" style={{ marginTop: 12 }}>
      同じ名前のジャンルが既にあります。
      このまま取り込むと既存ジャンルに追加されます。
      別のジャンルとして取り込む場合は、ジャンル名を変更してください。
    </div>
  )}
  
  {sharedImportError && (
    <div className="error" style={{ marginTop: 12 }}>
      {sharedImportError}
    </div>
  )}

  {sharedImportData && (
    <div style={{ marginTop: 16 }}>
      <div>
        元のジャンル名：{sharedImportData.genreName}
      </div>
      
      <div style={{ marginTop: 8 }}>
        カード数：{sharedImportData.links.length}件
      </div>

      <label style={{ display: "block", marginTop: 16 }}>
        取り込み先ジャンル名

        <input
          type="text"
          value={sharedImportGenreName}
          onChange={(e) =>
            setSharedImportGenreName(e.target.value)
          }
          style={{ display: "block", marginTop: 8 }}
        />
      </label>

            <button
  type="button"
  className="btn primary"
  onClick={runSharedImport}
disabled={
  sharedImporting ||
  pendingSharedImport !== null ||
  !sharedImportGenreName.trim()
}
  style={{ marginTop: 16 }}
>
  {sharedImporting
    ? "安全性を確認して取り込み中..."
    : "取り込みを実行"}
</button>

      {pendingSharedImport && (
  <div
    style={{
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      border: "1px solid #d6b76c",
      background: "#fff8e6",
    }}
  >
    <div style={{ fontWeight: 700 }}>
      有害コンテンツを含む可能性のあるカードが検出されました。
    </div>

    {pendingSharedImport.r18Count > 0 && (
      <div style={{ marginTop: 12 }}>
        R-18：{pendingSharedImport.r18Count}件
      </div>
    )}

    {pendingSharedImport.violenceCount > 0 && (
      <div style={{ marginTop: 4 }}>
        暴力表現：{pendingSharedImport.violenceCount}件
      </div>
    )}

    {pendingSharedImport.bugCount > 0 && (
  <div style={{ marginTop: 4 }}>
    虫：{pendingSharedImport.bugCount}件
  </div>
)}
    
    <div style={{ marginTop: 12 }}>
      これらのカードを含めて取り込みますか？
    </div>

    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 16,
      }}
    >
      <button
        type="button"
        className="btn primary"
        onClick={() => finishSharedImport(true)}
        disabled={sharedImporting}
      >
        除外して取り込む
      </button>

      <button
        type="button"
        className="btn"
        onClick={() => finishSharedImport(false)}
        disabled={sharedImporting}
      >
        すべて取り込む
      </button>

      <button
        type="button"
        className="btn"
        onClick={cancelSharedImport}
        disabled={sharedImporting}
      >
        キャンセル
      </button>
    </div>
  </div>
)}
      
    </div>
  )}
</div>

        {sharedImportResult && (
  <div
    style={{
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      background: "#eefaf0",
      border: "1px solid #b7dfbf",
      fontWeight: 700,
    }}
  >
    {sharedImportResult}
  </div>
)}
        
<div className="panel" style={{ marginBottom: 24 }}>
  <h2>ジャンル共有</h2>

  <p>
    選択したジャンルのカードだけを共有用JSONとして保存します。
  </p>

  <label>
    ジャンル

    <select
      value={shareGenre}
      onChange={(e) => setShareGenre(e.target.value)}
      style={{ marginLeft: 8 }}
    >
      {shareGenres.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  </label>

  <button
    type="button"
    className="btn primary"
    onClick={exportSharedGenre}
    disabled={!shareGenre}
    style={{ marginTop: 16 }}
  >
    共有用JSONを書き出す
  </button>
</div>
        
        <h2>エクスポート</h2>

        <p>
          現在のリンクとジャンルをJSONファイルとして保存します。
        </p>

        <button
          type="button"
          className="btn primary"
          onClick={exportBackup}
        >
          バックアップを書き出す
        </button>
      </div>
    </main>
  );
}