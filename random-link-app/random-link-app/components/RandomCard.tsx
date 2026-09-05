"use client";

import type { LinkRecord } from "@/lib/types";

export default function RandomCard({ item }: { item?: LinkRecord }) {

  if (!item) {
    return <div className="panel empty">表示できるURLがまだありません。</div>;
  }

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
  style={{
    objectFit: item.image_fit === "contain" ? "contain" : "cover",
  }}
/>
        ) : (
          <div className="no-thumb">NO IMAGE</div>
        )}
      </a>

      <div className="card-body">
      <a
  href={item.url}
  target="_blank"
  rel="noopener noreferrer"
  className="cardTitleLink"
>
  <h1 className="card-title">{item.title}</h1>
</a>
      </div>
    </article>
  </section>
);
}
