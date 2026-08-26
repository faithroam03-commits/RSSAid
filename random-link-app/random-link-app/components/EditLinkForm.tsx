"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { LinkRecord } from "@/lib/types";

export default function EditLinkForm({ item }: { item: LinkRecord }) {
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
        <label>ジャンル
          <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="例: ゲーム" />
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
          <button className="btn primary" disabled={busy}>保存</button>
          <button type="button" className="btn" onClick={scanImages} disabled={busy}>
            URLから画像候補を取得
          </button>
          <a className="btn" href={url} target="_blank" rel="noopener noreferrer">元URLを開く</a>
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
