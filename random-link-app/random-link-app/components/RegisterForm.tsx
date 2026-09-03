"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm({
  genres,
  initialUrl = "",
}: {
  genres: string[];
  initialUrl?: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [genre, setGenre] = useState("New");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [previewReady, setPreviewReady] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const router = useRouter();
  const [imageFit, setImageFit] = useState<"cover" | "contain">("cover");
  
  function clearInput() {
  setUrl("");
  setTitle("");
  setThumbnailUrl("");
  setCandidates([]);
  setPreviewReady(false);
  setMessage(null);
  setError(null);
  }
  function clearTitle() {
  setTitle("");
  }
  function changeUrl(value: string) {
  setUrl(value);

  setTitle("");
  setThumbnailUrl("");
  setCandidates([]);
  setPreviewReady(false);
  setMessage(null);
  setError(null);
  }
  
async function uploadThumbnail(
  e: React.ChangeEvent<HTMLInputElement>
) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setError("画像ファイルを選択してください。");
    return;
  }

  setError(null);

  try {
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const maxSize = 1200;

      let width = img.width;
      let height = img.height;

      if (width > maxSize || height > maxSize) {
        const scale = Math.min(
          maxSize / width,
          maxSize / height
        );

        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(imageUrl);
        setError("画像の処理に失敗しました。");
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL(
        "image/jpeg",
        0.82
      );

      setThumbnailUrl(dataUrl);
      setPreviewReady(true);

      URL.revokeObjectURL(imageUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      setError("画像を読み込めませんでした。");
    };

    img.src = imageUrl;
  } catch {
    setError("画像の読み込みに失敗しました。");
  }
}
async function fetchMetadata() {
  setBusy(true);
  setError(null);
  setMessage(null);

  try {
    const res = await fetch("/api/scan-images", {
    method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error || "ページ情報の取得に失敗しました。"
      );
    }

setUrl(data.url || url);
setTitle(data.title || "");
setThumbnailUrl(data.thumbnailUrl || "");
setCandidates(data.images || []);
setPreviewReady(true);
  } catch (e) {
    setError(
      e instanceof Error
        ? e.message
        : "ページ情報の取得に失敗しました。"
    );
  } finally {
    setBusy(false);
  }
}
async function submit(e: FormEvent) {
  e.preventDefault();
  setBusy(true);
  setError(null);
  setMessage(null);

  try {
    const res = await fetch("/api/links", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
body: JSON.stringify({
  url,
  title,
  thumbnailUrl,
  imageFit,
  genre,
}),
});
    
    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error || "登録に失敗しました。"
      );
    }

setMessage(`「${data.title}」を${genre}に追加しました。`);

router.push(`/?genre=${encodeURIComponent(genre)}`);
     
  } catch (e) {
    setError(
      e instanceof Error
        ? e.message
        : "登録に失敗しました。"
    );
  } finally {
    setBusy(false);
  }
}

  return (
    <form className="panel form" onSubmit={submit}>
      <label>
        登録するURL

        <div style={{ display: "flex", gap: 8 }}>
  <input
    type="url"
    required
    placeholder="https://example.com/..."
    value={url}
    onChange={(e) => changeUrl(e.target.value)}
    style={{ flex: 1 }}
  />

  {url && (
    <button
      type="button"
      className="btn"
      onClick={clearInput}
      aria-label="入力を削除"
    >
      ×
    </button>
  )}
</div>
        
      </label>

<label>
  ジャンル
  <select
    value={genre}
    onChange={(e) => setGenre(e.target.value)}
  >
    <option value="New">New</option>

    {genres
      .filter((g) => g !== "New")
      .map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
  </select>
</label>
      
     <button
  type="button"
  className="btn primary"
  disabled={busy || !url}
  onClick={fetchMetadata}
>
 {busy ? "情報を取得中..." : "情報を取得"}
</button>

      {previewReady && (
  <div className="panel" style={{ marginTop: 20 }}>

<label>
  タイトル

  <div style={{ display: "flex", gap: 8 }}>
    <input
      type="text"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      style={{ flex: 1 }}
    />

    {title && (
      <button
        type="button"
        className="btn"
        onClick={clearTitle}
        aria-label="タイトルを削除"
      >
        ×
      </button>
    )}
  </div>
</label>
  

{thumbnailUrl && (
  <div style={{ marginTop: 16 }}>
    <div className="small">取得したサムネイル</div>

    <div
      style={{
        width: "100%",
        height: 240,
        overflow: "hidden",
        background: "#eee",
        marginTop: 8,
      }}
    >
      <img
        src={thumbnailUrl}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: imageFit === "contain" ? "contain" : "cover",
          display: "block",
        }}
      />
    </div>

        <button
      type="submit"
      className="btn primary"
      disabled={busy}
      style={{ marginTop: 16 }}
    >
      URLを登録
    </button>
    
<label style={{ marginTop: 16 }}>
  サムネイルの大きさ:
  <select
    value={imageFit}
    onChange={(e) =>
      setImageFit(e.target.value as "cover" | "contain")
    }
  >
    <option value="cover">中心を優先</option>
    <option value="contain">全体を表示</option>
  </select>
</label>
        
  <label className="btn" style={{ marginTop: 16 }}>
  端末から画像を選択
  <input
    type="file"
    accept="image/*"
    onChange={uploadThumbnail}
    disabled={busy}
    style={{ display: "none" }}
  />
</label>
        
      </div>
    )}

{candidates.length > 0 && (
  <div style={{ marginTop: 20 }}>
    <h2>画像候補</h2>

    <div className="image-grid">
      {candidates.map((src) => (
        <button
          key={src}
          type="button"
          className={
            thumbnailUrl === src
            ? "image-choice selected"
            : "image-choice"
          }
          onClick={() => setThumbnailUrl(src)}
        >
          <img
            src={src}
            alt=""
            referrerPolicy="no-referrer"
          />
        </button>
      ))}
    </div>
  </div>
)}
    
  </div>
)}
      
      {message && <div className="notice">{message}</div>}
      {error && <div className="error">{error}</div>}
      <div className="small">
        タイトルと代表画像を自動取得し、ジャンル「New」に保存します。
      </div>
    </form>
  );
}
