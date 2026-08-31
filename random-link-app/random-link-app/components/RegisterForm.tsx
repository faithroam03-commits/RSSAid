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
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "content-type": "application/json" },

        body: JSON.stringify({
  url,
  genre,
})
      
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登録に失敗しました。");
      setMessage(`「${data.title}」をNewに追加しました。`);

      setUrl("");
setGenre("New");
router.refresh();
      
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <label>
        登録するURL
        <input
          type="url"
          required
          placeholder="https://example.com/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
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
      
      <button className="btn primary" disabled={busy}>
        {busy ? "情報を取得中..." : "URLを登録"}
      </button>
      {message && <div className="notice">{message}</div>}
      {error && <div className="error">{error}</div>}
      <div className="small">
        タイトルと代表画像を自動取得し、ジャンル「New」に保存します。
      </div>
    </form>
  );
}
