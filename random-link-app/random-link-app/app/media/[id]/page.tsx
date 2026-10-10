
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getClientMedia } from "@/lib/client-db";

export default function MediaPage() {
  const params = useParams();
  const id = Number(params.id);

  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;

    async function loadMedia() {
      try {
        if (!Number.isSafeInteger(id) || id <= 0) {
          throw new Error("メディアIDが不正です。");
        }

        const media = await getClientMedia(id);

        if (!media) {
          throw new Error("メディアが見つかりません。");
        }

        if (!media.mime_type.startsWith("image/")) {
          throw new Error("このメディア形式には未対応です。");
        }

        if (cancelled) return;

        objectUrl = URL.createObjectURL(media.blob);
        setImageUrl(objectUrl);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "メディアの読み込みに失敗しました。"
          );
        }
      }
    }

    loadMedia();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [id]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >

      {error && (
        <div
          role="alert"
          style={{
            color: "#fff",
            padding: 24,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      {!imageUrl && !error && (
        <p style={{ color: "#fff" }}>
          読み込み中...
        </p>
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          alt="登録したメディア"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      )}
    </div>
  );
}