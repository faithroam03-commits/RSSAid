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
        body: JSON.stringify({ url, title, thumbnailUrl, genre, enabled })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存に失敗しました。");
      setMsg("保存しました。");
      router.refresh();
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
        <label>タイトル
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>サムネイルURL
          <input type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />
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
            <img className="mini-thumb" src={thumbnailUrl} alt="" referrerPolicy="no-referrer" />
          </div>
        )}
        
<div className="actions">
  <button
    className="btn primary"
    disabled={busy}
  >
    保存
  </button>

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

  <a
    className="btn"
    href={url}
    target="_blank"
    rel="noopener noreferrer"
  >
    元URLを開く
  </a>
</div>
        
        {msg && <div className="notice">{msg}</div>}
        {error && <div className="error">{error}</div>}
      </form>

      {candidates.length > 0 && (
        <section style={{marginTop:20}}>
          <h2>画像候補</h2>
          <p className="small">画像を押すとサムネイルURL欄へセットします。最後に「保存」を押してください。</p>
          <div className="image-grid">
            {candidates.map((src) => (
              <button key={src} className="image-choice" type="button" onClick={() => setThumbnailUrl(src)}>
                <img src={src} alt="" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
