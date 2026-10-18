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
  const fromHome = searchParams.get("from") === "home";
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
 <EditLinkForm
  item={item}
  genres={genres}
  fromHome={fromHome}
/>
    </>
  );
}