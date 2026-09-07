"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
          URLメンテナンスへ戻る
        </Link>
      </>
    );
  }

  return (
    <>
      <h1>URL編集</h1>

      <EditLinkForm
        item={item}
        genres={genres}
      />
    </>
  );
}