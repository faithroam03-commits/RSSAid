"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteClientMedia,
  insertClientGenre,
  insertClientLink,
  insertClientMedia,
} from "@/lib/client-db";
export default function MediaRegisterForm({
  genres,
}: {
  genres: string[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [genre, setGenre] = useState("New");
const [imageFit, setImageFit] =
  useState<"cover" | "contain">("contain");
const [showGenreAdd, setShowGenreAdd] = useState(false);
const [newGenre, setNewGenre] = useState("");
const [localGenres, setLocalGenres] = useState(genres);
const [error, setError] = useState<string | null>(null);
const router = useRouter();
const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function selectImage(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const nextFile = event.target.files?.[0];

    if (!nextFile) {
      return;
    }

    loadImageFile(nextFile);
  }

  function loadImageFile(nextFile: File) {

    if (!nextFile.type.startsWith("image/")) {
      setError("画像ファイルを選択してください。");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(nextFile);

setFile(nextFile);
setPreviewUrl(nextPreviewUrl);
setThumbnailUrl("");
setError(null);

if (nextFile.type === "image/gif") {
  const maxGifSize = 20 * 1024 * 1024;

  if (nextFile.size > maxGifSize) {
    URL.revokeObjectURL(nextPreviewUrl);
    setFile(null);
    setPreviewUrl("");
    setError("GIF画像は20MB以下のファイルを選択してください。");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    if (typeof reader.result !== "string") {
      setError("GIF画像の読み込みに失敗しました。");
      return;
    }

    setThumbnailUrl(reader.result);
  };

  reader.onerror = () => {
    setError("GIF画像の読み込みに失敗しました。");
  };

  reader.readAsDataURL(nextFile);
} else {
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
      setError("画像の処理に失敗しました。");
      return;
    }

    ctx.drawImage(img, 0, 0, width, height);

    setThumbnailUrl(
      canvas.toDataURL("image/jpeg", 0.82)
    );
  };

  img.onerror = () => {
    setError("画像を読み込めませんでした。");
  };

  img.src = nextPreviewUrl;
}

const now = new Date();

const dateTitle =
  String(now.getFullYear()) +
  String(now.getMonth() + 1).padStart(2, "0") +
  String(now.getDate()).padStart(2, "0");

setTitle(`MyMediaLink_${dateTitle}`);
}

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    if (params.get("shared") !== "image") {
      return;
    }

    let cancelled = false;

    async function loadSharedImage() {
      try {
        const cache = await caches.open(
          "random-link-share-temp-v1"
        );

        const response = await cache.match(
          "/__shared-image"
        );

        if (!response) {
          throw new Error(
            "共有された画像が見つかりません。"
          );
        }

        const blob = await response.blob();

        const encodedName =
          response.headers.get("X-File-Name");

        let filename = "shared-image";

        if (encodedName) {
          try {
            filename = decodeURIComponent(
              encodedName
            );
          } catch {
            filename = "shared-image";
          }
        }

        const sharedFile = new File(
          [blob],
          filename,
          {
            type: blob.type || "image/jpeg",
          }
        );

        if (cancelled) {
          return;
        }

        loadImageFile(sharedFile);

        await cache.delete("/__shared-image");
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "共有画像の読み込みに失敗しました。"
          );
        }
      }
    }

    loadSharedImage();

    return () => {
      cancelled = true;
    };
  }, []);

async function registerMedia() {
  if (!file || !title.trim() || !thumbnailUrl || busy) {
    return;
  }

  const targetGenre = showGenreAdd
    ? newGenre.trim()
    : genre;

  if (!targetGenre) {
    setError("ジャンル名を入力してください。");
    return;
  }

  setBusy(true);
  setError(null);

  let mediaId: number | null = null;

try {
  if (
    showGenreAdd &&
    !localGenres.includes(targetGenre)
  ) {
    await insertClientGenre(targetGenre);
  }

  try {
    mediaId = await insertClientMedia({
        blob: file,
        filename: file.name,
        mimeType: file.type,
      });
    } catch (e) {
      throw new Error(
        "メディア保存段階: " +
          (e instanceof Error ? e.message : String(e))
      );
    }

    try {
      await insertClientLink({
        url: url.trim(),
        title: title.trim(),
        thumbnailUrl,
        imageFit,
        mediaId,
        genre: targetGenre,
      });
    } catch (e) {
      throw new Error(
        "カード保存段階: " +
          (e instanceof Error ? e.message : String(e))
      );
    }

router.push(
  `/?genre=${encodeURIComponent(targetGenre)}`
);
  } catch (e) {
    if (mediaId !== null) {
      try {
        await deleteClientMedia(mediaId);
      } catch {
        // 元のエラーを優先する
      }
    }

    setError(
      e instanceof Error
        ? e.message
        : "メディアの登録に失敗しました。"
    );
  } finally {
    setBusy(false);
  }
}

  return (
    <div className="panel">
      <h2>端末画像登録</h2>

      <label className="btn" style={{ marginTop: 16 }}>
        端末から画像を選択
        <input
          type="file"
          accept="image/*"
          onChange={selectImage}
          style={{ display: "none" }}
        />
      </label>

      {previewUrl && (
        <div style={{ marginTop: 16 }}>
          <div className="small">
            {file?.name}
          </div>

          <div
            style={{
              width: "100%",
              height: 240,
              overflow: "hidden",
              background: "#eee",
              marginTop: 8,
            }}
          >
            <img
              src={previewUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: imageFit,
                display: "block",
              }}
            />
          </div>
        </div>
      )}

      <label style={{ marginTop: 16 }}>
        タイトル
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label style={{ marginTop: 16 }}>
        URL（任意）
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://..."
        />
      </label>

      <div className="small" style={{ marginTop: 8 }}>
        URLが空欄の場合は、カードをタップするとメディアを開きます。
      </div>

{!showGenreAdd && (
  <label style={{ marginTop: 16 }}>
    ジャンル

    <details className="genreSelect">
      <summary>{genre || "選択してください"}</summary>

      <div className="genreSelectList">
        {localGenres.map((item) => (
          <button
            key={item}
            type="button"
            onClick={(event) => {
              setGenre(item);
              event.currentTarget
                .closest("details")
                ?.removeAttribute("open");
            }}
          >
            {item}
          </button>
        ))}
      </div>
    </details>
  </label>
)}

<button
  type="button"
  style={{
    marginTop: 12,
    width: "100%",
  }}
  onClick={() => {
    setShowGenreAdd(!showGenreAdd);
  }}
>
  {showGenreAdd
    ? "← 既存ジャンルに戻る"
    : "＋ 新規ジャンル"}
</button>

{showGenreAdd && (
  <div style={{ marginTop: 12 }}>
    <input
      type="text"
      value={newGenre}
      onChange={(event) =>
        setNewGenre(event.target.value)
      }
      placeholder="ジャンル名"
    />

    <div className="small">
      {newGenre.trim()
        ? `ジャンル「${newGenre.trim()}」を新規作成して登録`
        : "ジャンル名を入力してください"}
    </div>
  </div>
)}

<label style={{ marginTop: 16 }}>
  サムネイルの大きさ
  <select
    value={imageFit}
    onChange={(event) =>
      setImageFit(
        event.target.value as "cover" | "contain"
      )
    }
  >
    <option value="contain">全体を表示</option>
    <option value="cover">中心を優先</option>
  </select>
</label>

<button
  type="button"
  className="btn primary"
  disabled={
    !file ||
    !title.trim() ||
    !thumbnailUrl ||
    busy
  }
  style={{ marginTop: 20 }}
  onClick={registerMedia}
>
  {busy ? "登録中..." : "メディアを登録"}
</button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}