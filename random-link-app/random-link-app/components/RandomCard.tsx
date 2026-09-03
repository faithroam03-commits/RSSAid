"use client";

import { useRouter } from "next/navigation";
import type { LinkRecord } from "@/lib/types";

export default function RandomCard({ item, genre }: { item?: LinkRecord; genre?: string }) {
  const router = useRouter();

  if (!item) {
    return <div className="panel empty">表示できるURLがまだありません。</div>;
  }

  const refresh = () => {
  const base = genre
    ? `/?genre=${encodeURIComponent(genre)}`
    : "/";

  const separator = genre ? "&" : "?";

  router.push(`${base}${separator}r=${Date.now()}`);
  router.refresh();
};

return (
  <section className="hero">
    <article className="card">
      <a
        className="thumb-wrap"
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {item.thumbnail_url ? (
          <img
            className="thumb"
            src={item.thumbnail_url}
            alt=""
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="no-thumb">NO IMAGE</div>
        )}
      </a>

      <div className="card-body">
        <h1 className="card-title">{item.title}</h1>

        <div className="actions">
          <a
            className="btn primary"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            URLを開く
          </a>

          <button className="btn" onClick={refresh}>
            ↻ 別のページ
          </button>
        </div>
      </div>
    </article>
  </section>
);
}
