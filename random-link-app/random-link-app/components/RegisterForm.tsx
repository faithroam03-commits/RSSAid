"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
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
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登録に失敗しました。");
      setMessage(`「${data.title}」を新規登録に追加しました。`);
      setUrl("");
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
      <button className="btn primary" disabled={busy}>
        {busy ? "情報を取得中..." : "URLを登録"}
      </button>
      {message && <div className="notice">{message}</div>}
      {error && <div className="error">{error}</div>}
      <div className="small">
        タイトルと代表画像を自動取得し、ジャンル「新規登録」に保存します。
      </div>
    </form>
  );
}
