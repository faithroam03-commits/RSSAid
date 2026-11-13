"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import EditLinkForm from "@/components/EditLinkForm";
import {
  getClientGenres,
  getClientLink,
} from "@/lib/client-db";

type Props = {
  id: number;
};

export default function EditPageClient({
  id,
}: Props) {
const searchParams = useSearchParams();
const returnGenre = searchParams.get("genre") ?? undefined;
const fromHome = searchParams.get("from") === "home";
  const fromSlideshow =
  searchParams.get("from") === "slideshow";
  const [item, setItem] = useState<
    Awaited<ReturnType<typeof getClientLink>>
  >(undefined);

  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const linkItem = await getClientLink(id);
      const genreItems = await getClientGenres();

      setItem(linkItem);
      setGenres(genreItems);
      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) {
    return null;
  }

  if (!item) {
    return (
      <>
        <h1>URL編集</h1>

        <div className="empty">
          編集対象のURLが見つかりません。
        </div>

        <Link
          href="/admin"
          className="btn"
        >
          カードメンテナンスへ戻る
        </Link>
      </>
    );
  }

  return (
    <>
      <h1>{item.media_id != null ? "メディア編集" : "URL編集"}</h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          padding: "10px 12px",
          background: "rgba(128,128,128,0.08)",
          borderRadius: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            カードID
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              overflowWrap: "anywhere",
              userSelect: "text",
            }}
          >
            {item.id}
          </div>
        </div>

        <button
          type="button"
          className="btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                String(item.id)
              );
              alert("カードIDをコピーしました。");
            } catch {
              alert(
                "コピーに失敗しました。\n" +
                "IDを長押ししてコピーしてください。"
              );
            }
          }}
        >
          コピー
        </button>
      </div>

<EditLinkForm
  item={item}
  genres={genres}
  fromHome={fromHome}
  fromSlideshow={fromSlideshow}
  returnGenre={returnGenre}
/>
    </>
  );
}