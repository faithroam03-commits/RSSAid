"use client";

import {
  getClientGenreRecords,
  getClientLinks,
  importClientBackup,
  type ClientBackupData,
} from "@/lib/client-db";

import { useState } from "react";

export default function BackupPage() {
  
const [importData, setImportData] = useState<ClientBackupData | null>(null);
const [importError, setImportError] = useState("");

const [importResult, setImportResult] = useState("");
const [importing, setImporting] = useState(false);

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
      `インポート完了：リンク ${result.addedLinks}件、ジャンル ${result.addedGenres}件を追加しました。`
    );
  } catch (error) {
    console.error(error);
    setImportError("インポートに失敗しました。");
  } finally {
    setImporting(false);
  }
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
    const data = JSON.parse(text) as ClientBackupData;

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
  <div style={{ marginTop: 16 }}>
    {importResult}
  </div>
)}
          
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