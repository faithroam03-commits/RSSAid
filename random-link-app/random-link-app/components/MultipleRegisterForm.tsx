
"use client";

import { useState } from "react";
import { insertClientLink } from "@/lib/client-db";

type Props = {
  genres: string[];
};

type UrlItem = {
  number: number;
  value: string;
  valid: boolean;
  title: string;
  thumbnailUrl: string;
  imageFit: "cover" | "contain";
  candidates: string[];
  showAllCandidates: boolean;
  genre: string;
  status:
    | "pending"
    | "loading"
    | "ready"
    | "metadata_error"
    | "unsafe"
    | "safety_error"
    | "retry";
  notice: string;
  saveStatus: "unsaved" | "saving" | "saved" | "failed";
  safetyStatus: "unchecked" | "safe" | "unsafe" | "error";
};

const MAX_URLS = 100;

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);

    return (
      (parsed.protocol === "http:" ||
        parsed.protocol === "https:") &&
      Boolean(parsed.hostname) &&
      !/\s/.test(value)
    );
  } catch {
    return false;
  }
}

async function checkUrlsSafety(
  urls: string[]
): Promise<boolean[]> {
  const response = await fetch("/api/check-urls", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ urls }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "URLの安全性を確認できません。"
    );
  }

  const results = data.results;

  if (
    !Array.isArray(results) ||
    results.length !== urls.length ||
    results.some(
      (result, index) =>
        result.url !== urls[index] ||
        typeof result.safe !== "boolean"
    )
  ) {
    throw new Error(
      "安全性確認の結果が正しく取得できませんでした。"
    );
  }

  return results.map(
    (result: { safe: boolean }) => result.safe
  );
}

function applySafetyResults(
  currentItems: UrlItem[],
  targetNumbers: number[],
  safeResults: boolean[]
): UrlItem[] {
  return currentItems.map((item) => {
    const index = targetNumbers.indexOf(item.number);

    if (index === -1 || item.saveStatus === "saved") {
      return item;
    }

    return {
      ...item,
      safetyStatus: safeResults[index] ? "safe" : "unsafe",
    };
  });
}

function isSaveCandidate(item: UrlItem): boolean {
  return (
    item.valid &&
    (item.status === "ready" ||
      item.status === "metadata_error") &&
    item.safetyStatus === "safe" &&
    item.saveStatus !== "saved" &&
    item.title.trim().length > 0 &&
    item.genre.trim().length > 0
  );
}

function getExcludedNumbers(items: UrlItem[]): number[] {
  return items
    .filter(
      (item) =>
        item.saveStatus !== "saved" &&
        !isSaveCandidate(item)
    )
    .map((item) => item.number);
}

function getExcludeReason(item: UrlItem): string {
  if (!item.valid) {
    return "URL形式が不正";
  }

  if (
    item.status === "unsafe" ||
    item.safetyStatus === "unsafe"
  ) {
    return "危険なURL";
  }

  if (!item.title.trim()) {
    return "タイトル未入力";
  }

  if (!item.genre.trim()) {
    return "ジャンル未指定";
  }

  if (item.safetyStatus !== "safe") {
    return "安全性を確認できません";
  }

  if (
    item.status !== "ready" &&
    item.status !== "metadata_error"
  ) {
    return "URLの読み込みが未完了";
  }

  return "登録できない状態";
}

async function checkSafetyForSave(
  currentItems: UrlItem[]
): Promise<UrlItem[]> {
  const targets = currentItems.filter(
    (item) =>
      item.valid &&
      item.saveStatus !== "saved" &&
      item.status !== "unsafe"
  );

  if (targets.length === 0) {
    return currentItems;
  }

  const results = await checkUrlsSafety(
    targets.map((item) => item.value)
  );

  return applySafetyResults(
    currentItems,
    targets.map((item) => item.number),
    results
  );
}

async function convertThumbnailFile(
  file: File
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選択してください。");
  }

  if (file.type === "image/gif") {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(
        "GIF画像は5MB以下のファイルを選択してください。"
      );
    }

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("GIF画像の読み込みに失敗しました。"));
        }
      };

      reader.onerror = () => {
        reject(new Error("GIF画像の読み込みに失敗しました。"));
      };

      reader.readAsDataURL(file);
    });
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error("画像を読み込めませんでした。"));
      img.src = objectUrl;
    });

    const maxSize = 1200;
    const scale = Math.min(
      1,
      maxSize / img.width,
      maxSize / img.height
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("画像の処理に失敗しました。");
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function MultipleRegisterForm({
  genres,
}: Props) {
  const [urlText, setUrlText] = useState("");
  const [genre, setGenre] = useState("New");
  const [availableGenres, setAvailableGenres] = useState(genres);
  const [showGenreAdd, setShowGenreAdd] = useState(false);
  const [newGenre, setNewGenre] = useState("");
  const [items, setItems] = useState<UrlItem[]>([]);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [fetchTotal, setFetchTotal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveTotal, setSaveTotal] = useState(0);
  const [isCheckingSafety, setIsCheckingSafety] = useState(false);
  const [showExcludeConfirm, setShowExcludeConfirm] = useState(false);

    async function handleThumbnailFile(
    number: number,
    file: File | undefined
  ) {
    if (!file || isSaving || isCheckingSafety) {
      return;
    }

    try {
      const thumbnailUrl = await convertThumbnailFile(file);

      setItems((prev) =>
        prev.map((item) =>
          item.number === number &&
          item.saveStatus !== "saved"
            ? { ...item, thumbnailUrl }
            : item
        )
      );

      setError("");
    } catch (error) {
      setError(
        error instanceof Error
          ? `No.${number}：${error.message}`
          : `No.${number}：画像の読み込みに失敗しました。`
      );
    }
    }
  
    async function fetchItemMetadata(item: UrlItem): Promise<UrlItem> {
    if (!item.valid) {
      return item;
    }

    try {
      const res = await fetch("/api/scan-images", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ url: item.value }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message =
          data.error || "ページ情報の取得に失敗しました。";

        if (data.errorCode === "UNSAFE_URL") {
          return {
            ...item,
            status: "unsafe",
            notice: message,
          };
        }

        if (data.errorCode === "METADATA_FETCH_FAILED") {
          return {
            ...item,
            status: "metadata_error",
            notice: message,
          };
        }

        if (res.status === 429) {
          return {
            ...item,
            status: "retry",
            notice: message,
          };
        }

        return {
          ...item,
          status: "safety_error",
          notice: message,
        };
      }

      return {
        ...item,
        value: data.url || item.value,
        title: data.title || item.title,
        thumbnailUrl: data.thumbnailUrl || "",
        candidates: Array.isArray(data.images)
          ? data.images
          : [],
        status: "ready",
        notice: "",
      };
    } catch {
      return {
        ...item,
        status: "retry",
        notice:
          "通信に失敗しました。後でもう一度取得してください。",
      };
    }
    }

    async function fetchAllMetadata(targetItems: UrlItem[]) {
    if (isFetching) {
      return;
    }

    const targets = targetItems.filter(
      (item) =>
        item.valid &&
        (item.status === "pending" ||
          item.status === "retry" ||
          item.status === "safety_error")
    );

    setIsFetching(true);
    setFetchProgress(0);
    setFetchTotal(targets.length);

    try {
      for (let index = 0; index < targets.length; index++) {
        const target = targets[index];

        setItems((prev) =>
          prev.map((item) =>
            item.number === target.number
              ? { ...item, status: "loading" }
              : item
          )
        );

        const result = await fetchItemMetadata(target);

        setItems((prev) =>
          prev.map((item) =>
            item.number === target.number
              ? {
                  ...item,
                  ...result,
                }
              : item
          )
        );

        setFetchProgress(index + 1);

        if (result.status === "retry") {
          // アクセス制限や通信エラーの場合は
          // 残りを未取得のまま保持する。
          break;
        }
      }
    } finally {
      setIsFetching(false);
    }
    }
  
  function handleLoad() {
  if (isFetching || isSaving || isCheckingSafety) {
    return;
  }

  const lines = urlText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length > MAX_URLS) {
      setError(
        `一度に読み込めるURLは${MAX_URLS}件までです。` +
          "URLを減らして再試行してください。"
      );
      setItems([]);
      setHasLoaded(false);
      return;
    }

    if (lines.length === 0) {
      setError("URLを1件以上入力してください。");
      setItems([]);
      setHasLoaded(false);
      return;
    }

const nextItems: UrlItem[] = lines.map(
  (value, index) => ({
    number: index + 1,
    value,
    valid: isValidHttpUrl(value),
    title: "",
    thumbnailUrl: "",
    imageFit: "contain",
    candidates: [],
    showAllCandidates: false,
    genre: showGenreAdd ? newGenre.trim() || "New" : genre,
    status: "pending",
    notice: "",
    saveStatus: "unsaved",
    safetyStatus: "unchecked",
  })
);

    setItems(nextItems);
    setError("");
    setHasLoaded(true);
    void fetchAllMetadata(nextItems);
  }

async function handleRequestSave() {
  if (
    !hasLoaded ||
    isFetching ||
    isSaving ||
    isCheckingSafety
  ) {
    return;
  }

  if (
    items.length > 0 &&
    items.every((item) => item.saveStatus === "saved")
  ) {
    setError("");
    setSaveNotice("すべて登録済みです。");
    return;
  }

  setSaveNotice("");
  setIsCheckingSafety(true);
  setShowExcludeConfirm(false);
  setError("");

  try {
    // 登録対象の安全性を自動確認する
    const checkedItems = await checkSafetyForSave(items);

    // 判定結果をカードに反映する
    setItems(checkedItems);

    const candidates = checkedItems.filter(isSaveCandidate);

    if (candidates.length === 0) {
      setError(
        "登録可能なURLがありません。" +
        "安全性確認やタイトルの入力状態を確認してください。"
      );
      return;
    }

    const excludedNumbers = getExcludedNumbers(checkedItems);

    if (excludedNumbers.length > 0) {
      setShowExcludeConfirm(true);
      return;
    }

  await saveCheckedItems(checkedItems);
  
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "URLの安全性を確認できませんでした。";

    setItems((prev) =>
      prev.map((item) =>
        item.valid &&
        item.saveStatus !== "saved" &&
        item.status !== "unsafe"
          ? {
              ...item,
              safetyStatus: "error" as const,
            }
          : item
      )
    );

    setError(message);
  } finally {
    setIsCheckingSafety(false);
  }
}

async function handleConfirmExclude() {
  if (
    !showExcludeConfirm ||
    isFetching ||
    isSaving ||
    isCheckingSafety
  ) {
    return;
  }

  setIsCheckingSafety(true);
  setError("");

  try {
    const previousExcluded = getExcludedNumbers(items);

    // 除外して保存する直前にも安全性を再確認する
    const checkedItems = await checkSafetyForSave(items);
    setItems(checkedItems);

    const nextExcluded = getExcludedNumbers(checkedItems);

    // 新しく登録不可になったURLがあれば保存を中止
    const changed = nextExcluded.some(
      (number) => !previousExcluded.includes(number)
    );

    if (changed) {
      setError(
        "登録できないURLが増えました。" +
        "除外対象を再確認してください。"
      );
      return;
    }

    const candidates = checkedItems.filter(isSaveCandidate);

    if (candidates.length === 0) {
      setError("登録可能なURLがありません。");
      return;
    }

    setShowExcludeConfirm(false);
    await saveCheckedItems(checkedItems);
  } catch (e) {
    setItems((prev) =>
      prev.map((item) =>
        item.valid &&
        item.saveStatus !== "saved" &&
        item.status !== "unsafe"
          ? { ...item, safetyStatus: "error" as const }
          : item
      )
    );

    setError(
      e instanceof Error
        ? e.message
        : "安全性を確認できませんでした。"
    );
  } finally {
    setIsCheckingSafety(false);
  }
}

async function saveCheckedItems(
  checkedItems: UrlItem[]
) {
  const targets = checkedItems.filter(isSaveCandidate);

  if (targets.length === 0) {
    return;
  }

  setIsSaving(true);
  setSaveProgress(0);
  setSaveTotal(targets.length);

  const failedNumbers: number[] = [];

  try {
    for (const [index, item] of targets.entries()) {
      setItems((prev) =>
        prev.map((current) =>
          current.number === item.number
            ? { ...current, saveStatus: "saving" }
            : current
        )
      );

      try {
await insertClientLink({
  url: item.value,
  title: item.title.trim(),
  thumbnailUrl: item.thumbnailUrl,
  genre: item.genre,
  imageFit: item.imageFit,
});

        setItems((prev) =>
          prev.map((current) =>
            current.number === item.number
              ? { ...current, saveStatus: "saved" }
              : current
          )
        );
      } catch {
        failedNumbers.push(item.number);

        setItems((prev) =>
          prev.map((current) =>
            current.number === item.number
              ? { ...current, saveStatus: "failed" }
              : current
          )
        );
      }

      setSaveProgress(index + 1);
    }

    if (failedNumbers.length > 0) {
      setError(
        `No.${failedNumbers.join("、No.")}の保存に失敗しました。`
      );
    } else {
      setError("");
      window.location.assign("/");
    }
  } finally {
    setIsSaving(false);
  }
}
  const validCount = items.filter(
    (item) => item.valid
  ).length;

  const errorCount = items.length - validCount;

  const unsafeCount = items.filter(
    (item) =>
      item.status === "unsafe" ||
      item.safetyStatus === "unsafe"
  ).length;
  
  return (
    <div className="panel form">
      <h2>複数URL登録</h2>

      <label>
        登録するURL（改行区切り）
        <textarea
          value={urlText}
          onChange={(e) => setUrlText(e.target.value)}
          rows={6}
          placeholder={
            "https://example.com/1\n" +
            "https://example.com/2\n" +
            "https://example.com/3"
          }
        />
      </label>

<button
  type="button"
  className="btn primary"
  onClick={handleLoad}
disabled={isFetching || isSaving || isCheckingSafety}
>
  {isFetching ? "ページ情報を取得中..." : "URLを読み込む"}
</button>

{isFetching && (
  <p role="status">
    ページ情報を取得中：{fetchProgress} / {fetchTotal}件
  </p>
)}

{hasLoaded &&
  !isFetching &&
  items.some(
    (item) =>
      item.valid &&
      (item.status === "pending" ||
        item.status === "retry" ||
        item.status === "safety_error")
  ) && (
    <button
      type="button"
      className="btn"
      onClick={() => void fetchAllMetadata(items)}
    >
      未取得・失敗したURLを再試行
    </button>
  )}

{error && !hasLoaded && (
  <p role="alert" style={{ color: "crimson" }}>
    {error}
  </p>
)}

      {hasLoaded && (
        <div style={{ marginTop: 20 }}>
          <h3>読み込み結果</h3>

<p>
  読み込み対象：{items.length}件
  <br />
  URL形式が正常：{validCount}件
  <br />
  URL形式エラー：{errorCount}件
  <br />
  危険URL：{unsafeCount}件
</p>

{!showGenreAdd && (
<div>
  <label htmlFor="bulk-genre">
    ジャンルの一括指定
  </label>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    <select
      id="bulk-genre"
      value={genre}
      onChange={(e) => setGenre(e.target.value)}
      style={{
        flex: 1,
        minWidth: 0,
      }}
    >
      <option value="New">New</option>
{availableGenres
  .filter((g) => g !== "New")
  .map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
    </select>

<button
  type="button"
  className="btn"
  disabled={!hasLoaded || isFetching || isSaving || isCheckingSafety}
        onClick={() => {
setItems((prev) =>
  prev.map((item) =>
    item.saveStatus === "saved"
      ? item
      : { ...item, genre }
  )
          );
        }}
        style={{
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        全件に適用
      </button>
  </div>
</div>

)}

<button
  type="button"
  style={{ width: "100%", marginTop: 12, marginBottom: 16 }}
  disabled={isFetching}
  onClick={() => {
    if (showGenreAdd) {
      setNewGenre("");
    }
    setShowGenreAdd((prev) => !prev);
  }}
>
  {showGenreAdd
    ? "← 既存ジャンルに戻る"
    : "＋ 新規ジャンル"}
</button>

{showGenreAdd && (
  <div>
    <label htmlFor="bulk-new-genre">
     ジャンル名
    </label>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <input
        id="bulk-new-genre"
        type="text"
        value={newGenre}
        onChange={(e) => setNewGenre(e.target.value)}
        placeholder="ジャンル名"
        style={{
          flex: 1,
          minWidth: 0,
        }}
      />

      <button
        type="button"
disabled={
  !hasLoaded ||
  isFetching ||
  isSaving ||
  isCheckingSafety ||
  !newGenre.trim()
}
        onClick={() => {
          const name = newGenre.trim();

setItems((prev) =>
  prev.map((item) =>
    item.saveStatus === "saved"
      ? item
      : { ...item, genre: name }
  )
);
        }}
        style={{
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        全件に適用
      </button>
    </div>

    <div className="small">
      {newGenre.trim()
        ? `ジャンル「${newGenre.trim()}」を新規作成して登録`
        : "ジャンル名を入力してください"}
    </div>
  </div>
)}

          {items.map((item) => (
            <div
              key={item.number}
              style={{
                border: "1px solid #ccc",
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <strong>No.{item.number}</strong>

              <p
                style={{
                  overflowWrap: "anywhere",
                  marginBottom: 8,
                }}
              >
                {item.value}
              </p>

  {item.valid ? (
  <div>
    <p>
      取得状態：
      {item.status === "pending" && "取得待ち"}
      {item.status === "loading" && "取得中"}
      {item.status === "ready" && "取得完了"}
      {item.status === "metadata_error" &&
        "ページ情報取得失敗（手動編集可能）"}
      {item.status === "unsafe" && "危険URL（登録不可）"}
      {item.status === "safety_error" &&
        "安全性確認失敗（登録保留）"}
      {item.status === "retry" && "再試行待ち"}
    </p>

    {item.notice && (
      <p role="alert" style={{ color: "crimson" }}>
        {item.notice}
      </p>
    )}
    <p>
      登録前の安全性確認：
      {item.status === "unsafe" ||
      item.safetyStatus === "unsafe"
        ? "危険なURL（登録不可）"
        : item.safetyStatus === "safe"
        ? "安全性確認済み"
        : item.safetyStatus === "error"
        ? "確認失敗（再試行が必要）"
        : "未確認"}
    </p>

<p>
  登録状態：
  {item.saveStatus === "unsaved" && "未登録"}
  {item.saveStatus === "saving" && "登録中..."}
  {item.saveStatus === "saved" && "登録済み"}
  {item.saveStatus === "failed" &&
    "登録失敗（再試行可能）"}
</p>

{(item.status === "ready" ||
  item.status === "metadata_error") && (
  <label>
    タイトル
<input
  type="text"
  value={item.title}
  disabled={isSaving || isCheckingSafety || item.saveStatus === "saved"}
  onChange={(e) => {
        const nextTitle = e.target.value;

        setItems((prev) =>
          prev.map((current) =>
            current.number === item.number
              ? { ...current, title: nextTitle }
              : current
          )
        );
      }}
      placeholder="タイトルを入力"
    />
  </label>
)}

{(item.status === "ready" ||
  item.status === "metadata_error") && (
  <label>
    ジャンル
    <select
  value={item.genre}
  disabled={isSaving || isCheckingSafety || item.saveStatus === "saved"}
  onChange={(e) => {
        const nextGenre = e.target.value;

        setItems((prev) =>
          prev.map((current) =>
            current.number === item.number
              ? { ...current, genre: nextGenre }
              : current
          )
        );
      }}
    >
<option value="New">New</option>

{genres
  .filter((g) => g !== "New")
  .map((g) => (
    <option key={g} value={g}>
      {g}
    </option>
  ))}

{item.genre !== "New" &&
  !genres.includes(item.genre) && (
    <option value={item.genre}>
      {item.genre}（新規）
    </option>
  )}
</select>
  </label>
)}

{(item.status === "ready" ||
  item.status === "metadata_error") && (
  <div>
    <label>
      サムネイルURL（手動編集可能）
      <input
  type="url"
  value={item.thumbnailUrl}
  disabled={isSaving || isCheckingSafety || item.saveStatus === "saved"}
  onChange={(e) => {
          const nextUrl = e.target.value;

          setItems((prev) =>
            prev.map((current) =>
              current.number === item.number
                ? { ...current, thumbnailUrl: nextUrl }
                : current
            )
          );
        }}
        placeholder="https://example.com/image.jpg"
      />
    </label>

    {item.thumbnailUrl && (
      <div style={{ marginTop: 12 }}>
        <p>選択中のサムネイル</p>
        <img
          src={item.thumbnailUrl}
          alt="選択中のサムネイル"
style={{
  width: "100%",
  height: 180,
  objectFit: item.imageFit,
}}
        />
      </div>
    )}
{(item.status === "ready" ||
  item.status === "metadata_error") && (
  <label>
    サムネイルの大きさ
    <select
      value={item.imageFit}
      disabled={
        isSaving ||
        isCheckingSafety ||
        item.saveStatus === "saved"
      }
      onChange={(e) => {
        const nextFit = e.target.value as
          | "cover"
          | "contain";

        setItems((prev) =>
          prev.map((current) =>
            current.number === item.number
              ? { ...current, imageFit: nextFit }
              : current
          )
        );
      }}
    >
      <option value="contain">全体を表示</option>
      <option value="cover">中心を優先</option>
    </select>
  </label>
)}
  </div>
)}
{(item.status === "ready" ||
  item.status === "metadata_error") && (
  <label
    className="btn"
    style={{
      display: "inline-block",
      marginTop: 16,
    }}
  >
    端末から画像を選択
    <input
      type="file"
      accept="image/*"
      disabled={
        isSaving ||
        isCheckingSafety ||
        item.saveStatus === "saved"
      }
      onChange={(e) => {
        const file = e.target.files?.[0];
        void handleThumbnailFile(item.number, file);
        e.target.value = "";
      }}
      style={{ display: "none" }}
    />
  </label>
)}

{(item.status === "ready" ||
  item.status === "metadata_error") &&
  item.candidates.length > 0 && (
    <div>
      <p>サムネイル候補（タップして選択）</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
        }}
      >
{item.candidates
  .slice(0, item.showAllCandidates ? undefined : 4)
  .map((candidate, index) => (
          <button
  key={`${candidate}-${index}`}
  type="button"
  disabled={isSaving || isCheckingSafety || item.saveStatus === "saved"}
  onClick={() =>
              setItems((prev) =>
                prev.map((current) =>
                  current.number === item.number
                    ? { ...current, thumbnailUrl: candidate }
                    : current
                )
              )
            }
            style={{
              padding: 6,
              border:
                item.thumbnailUrl === candidate
                  ? "3px solid #2563eb"
                  : "1px solid #ccc",
              borderRadius: 8,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <img
              src={candidate}
              alt={`候補画像${index + 1}`}
              style={{
                width: "100%",
                height: 110,
                objectFit: "contain",
              }}
            />
          </button>
        ))}
      </div>

      {item.candidates.length > 4 && (
  <button
    type="button"
    className="btn"
    onClick={() =>
      setItems((prev) =>
        prev.map((current) =>
          current.number === item.number
            ? {
                ...current,
                showAllCandidates:
                  !current.showAllCandidates,
              }
            : current
        )
      )
    }
  >
    {item.showAllCandidates
      ? "候補を閉じる"
      : `候補をもっと見る（残り${item.candidates.length - 4}件）`}
  </button>
)}

    </div>
  )}

  </div>
) : (
                <p
                  role="alert"
                  style={{ color: "crimson" }}
                >
                  No.{item.number}：URL形式エラー
                  <br />
                  HTTP・HTTPSの完全なURLを
                  入力してください。
                </p>
              )}
            </div>
          ))}
        </div>
      )}

{showExcludeConfirm && (
  <div
    role="alert"
    style={{
      border: "1px solid #ccc",
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    }}
  >
    <p>登録できないURLがあります。</p>

    <ul>
      {items
        .filter(
          (item) =>
            item.saveStatus !== "saved" &&
            !isSaveCandidate(item)
        )
        .map((item) => (
          <li key={item.number}>
            No.{item.number}：{getExcludeReason(item)}
          </li>
        ))}
    </ul>

    <p>
      内容を修正するか、これらを除外して登録しますか？
    </p>

    <button
      type="button"
      className="btn"
      onClick={() => setShowExcludeConfirm(false)}
    >
      戻る
    </button>
<button
  type="button"
  className="btn primary"
  disabled={isFetching || isSaving || isCheckingSafety}
  onClick={() => void handleConfirmExclude()}
>
  {isCheckingSafety
    ? "安全性を再確認中..."
    : "除外して登録"}
</button>

  </div>
)}

{hasLoaded && (
  <button
    type="button"
    className="btn primary"
    disabled={isFetching || isSaving || isCheckingSafety}
    onClick={handleRequestSave}
  >
    URLを登録
  </button>
)}

{saveNotice && hasLoaded && (
  <p role="status">
    {saveNotice}
  </p>
)}

{error && hasLoaded && (
  <p role="alert" style={{ color: "crimson" }}>
    {error}
  </p>
)}

{saveTotal > 0 && (
  <p role="status">
    {isSaving ? "登録処理中" : "登録処理終了"}：
    {saveProgress} / {saveTotal}件
  </p>
)}
    </div>
  );
}
