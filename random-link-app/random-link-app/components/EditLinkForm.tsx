"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { LinkRecord } from "@/lib/types";


export default function EditLinkForm({
  item,
  genres,
}: {
  item: LinkRecord;
  genres: string[];
}) {
   
  const router = useRouter();
  const [url, setUrl] = useState(item.url);
  const [title, setTitle] = useState(item.title);
  const [thumbnailUrl, setThumbnailUrl] = useState(item.thumbnail_url || "");
  const [imageFit, setImageFit] = useState<"cover" | "contain">(
  item.image_fit || "cover"
);
  const [genre, setGenre] = useState(item.genre);
  const [enabled, setEnabled] = useState(Boolean(item.enabled));
  const [candidates, setCandidates] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null); setError(null);
    try {
      const res = await fetch(`/api/links/${item.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageFit,url, title, thumbnailUrl, genre, enabled })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存に失敗しました。");
      setMsg("保存しました。");
      router.push("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function scanImages() {
    setBusy(true); setMsg(null); setError(null);
    try {
      const res = await fetch(`/api/links/${item.id}/scan-images`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "画像取得に失敗しました。");
      setCandidates(data.images || []);
      if (data.title && !title) setTitle(data.title);
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像取得に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="panel form" onSubmit={save}>
        <label>URL
          <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
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
        onClick={() => setTitle("")}
        aria-label="タイトルを削除"
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
        
        <label style={{display:"flex", gridTemplateColumns:"auto 1fr", alignItems:"center", justifyContent:"start"}}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          ランダム表示の対象にする
        </label>
{thumbnailUrl && (
  <div>
    <div className="small">現在のサムネイル</div>

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
        referrerPolicy="no-referrer"
        style={{
          width: "100%",
          height: "100%",
          objectFit: imageFit === "contain" ? "contain" : "cover",
          display: "block",
        }}
      />
    </div>
  </div>
)}
<div className="actions">
  <button
    className="btn primary"
    disabled={busy}
  >
    保存
  </button>

  <a
    className="btn"
    href={url}
    target="_blank"
    rel="noopener noreferrer"
  >
    元URLを開く
  </a>
  
  <button
    type="button"
    className="btn"
    onClick={scanImages}
    disabled={busy}
  >
    URLから画像候補を取得
  </button>

  <label className="btn">
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

  <label>
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
        
        
        {msg && <div className="notice">{msg}</div>}
        {error && <div className="error">{error}</div>}
      </form>

      {candidates.length > 0 && (
        <section style={{marginTop:20}}>
          <h2>画像候補</h2>
          <p className="small">画像を押すとサムネイルURL欄へセットします。最後に「保存」を押してください。</p>
          <div className="image-grid">
            {candidates.map((src) => (
             <button key={src} className={thumbnailUrl === src ? "image-choice selected" : "image-choice"} type="button" onClick={() => setThumbnailUrl(src)}>
                <img src={src} alt="" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
