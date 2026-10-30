"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  saveDownloadFolder,
  getDownloadFolder,
  clearDownloadFolder,
} from "@/lib/download-folder";

const STORAGE_KEY = "randomLinkOpenBrowser";

const browserOptions = [
  { value: "default", label: "端末の標準設定" },
  { value: "chrome", label: "Chrome" },
  { value: "firefox", label: "Firefox" },
  { value: "edge", label: "Edge" },
  { value: "brave", label: "Brave" },
  { value: "vivaldi", label: "Vivaldi" },
  { value: "opera", label: "Opera" },
];

export default function SettingsPage() {
  const [browser, setBrowser] = useState("default");
  const [loaded, setLoaded] = useState(false);
  const [folderTestResult, setFolderTestResult] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (
      saved &&
      browserOptions.some(
        (option) => option.value === saved,
      )
    ) {
      setBrowser(saved);
    }

    setLoaded(true);
  }, []);

useEffect(() => {
  let cancelled = false;

  async function restoreFolder() {
    try {
      const folder = await getDownloadFolder();

      if (cancelled || !folder) return;

setFolderTestResult(
  `保存先フォルダ：${folder.name}`
);
    } catch (error) {
      if (!cancelled) {
        setFolderTestResult(
          `保存先の復元に失敗しました：${
            error instanceof Error
              ? error.message
              : "不明なエラー"
          }`
        );
      }
    }
  }

  void restoreFolder();

  return () => {
    cancelled = true;
  };
}, []);

  function changeBrowser(value: string) {
    setBrowser(value);
    localStorage.setItem(STORAGE_KEY, value);
  }

  async function testFolderPicker() {
    type PickerWindow = Window & {
      showDirectoryPicker?: (options?: {
        mode?: "read" | "readwrite";
      }) => Promise<FileSystemDirectoryHandle>;
    };

    const pickerWindow = window as PickerWindow;

    if (!pickerWindow.showDirectoryPicker) {
      setFolderTestResult(
        "このブラウザはフォルダ選択に対応していません。"
      );
      return;
    }

    try {
      const folder = await pickerWindow.showDirectoryPicker({
        mode: "readwrite",
      });

await saveDownloadFolder(folder);



      setFolderTestResult(
        `フォルダ選択成功：${folder.name}`
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        setFolderTestResult(
          "フォルダ選択をキャンセルしました。"
        );
      } else {
        setFolderTestResult(
          `フォルダ選択失敗：${
            error instanceof Error
              ? error.message
              : "不明なエラー"
          }`
        );
      }
    }
  }

async function resetDownloadFolder() {
  if (!window.confirm(
    "画像の保存先設定を解除しますか？\n保存済みの画像は削除されません。"
  )) {
    return;
  }

  try {
    await clearDownloadFolder();

    setFolderTestResult(
      "保存先の設定を解除しました。"
    );
  } catch (error) {
    setFolderTestResult(
      `設定の解除に失敗しました：${
        error instanceof Error
          ? error.message
          : "不明なエラー"
      }`
    );
  }
}

  return (
    <main className="container">
      <h1>設定</h1>

      <section className="panel form">
        <label>
          リンクを開くブラウザ

          <select
            value={browser}
            onChange={(e) =>
              changeBrowser(e.target.value)
            }
            style={{
              visibility: loaded ? "visible" : "hidden",
            }}
          >
  
            {browserOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="small">
          登録したカードを開くときに使用します。
        </div>
      </section>

      <section className="panel form">
        <h2>画像の保存先</h2>

        <button
          type="button"
          className="btn"
          onClick={testFolderPicker}
        >
          保存先フォルダを選択
        </button>

<button
  type="button"
  className="btn"
  onClick={resetDownloadFolder}
  style={{ marginTop: 12 }}
>
  保存先設定を解除
</button>

        {folderTestResult && (
          <p className="small" role="status">
            {folderTestResult}
          </p>
        )}

<p className="small">
  サムネイル画像の保存先フォルダを指定できます。
  保存先を指定していない場合は、
  ブラウザ標準のダウンロード先に保存します。
</p>
      </section>

      <section className="panel">
        <Link href="/help">
          使い方
        </Link>
      </section>
    </main>
);
}