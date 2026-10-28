export type ThumbnailDownloadResult =
  | { ok: true }
  | { ok: false; error: string };

function safeFileName(title: string): string {
  return (
    title
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "thumbnail"
  );
}

function timestamp(): string {
  const now = new Date();

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}` +
    `${pad(now.getDate())}_${pad(now.getHours())}` +
    `${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

function extensionFromType(type: string): string {
  const mime = type.toLowerCase().split(";")[0].trim();

  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "image/bmp":
      return "bmp";
    case "image/svg+xml":
      return "svg";
    default:
      return "img";
  }
}

export async function downloadThumbnail(
  imageUrl: string,
  title: string
): Promise<ThumbnailDownloadResult> {
  if (!imageUrl.trim()) {
    return { ok: false, error: "サムネイルがありません。" };
  }

  let objectUrl: string | null = null;

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`画像取得に失敗しました（${response.status}）。`);
    }

    const blob = await response.blob();

    if (!blob.type.toLowerCase().startsWith("image/")) {
      throw new Error("取得したファイルが画像ではありません。");
    }

    objectUrl = URL.createObjectURL(blob);

    const extension = extensionFromType(blob.type);
    const fileName = `${safeFileName(title)}_${timestamp()}.${extension}`;

    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    return { ok: true };
  } catch (error) {
    const isFetchError =
      error instanceof TypeError ||
      (error instanceof Error &&
        error.message === "Failed to fetch");

    return {
      ok: false,
      error: isFetchError
        ? "画像を取得できませんでした。\n\n" +
          "画像提供元のアクセス制限（CORS）または通信エラーの可能性があります。\n\n" +
          "別のサムネイル候補をお試しください。"
        : error instanceof Error
          ? error.message
          : "画像のダウンロードに失敗しました。",
    };
  } finally {
    if (objectUrl) {
      // ブラウザがダウンロード処理を開始できるよう、
      // 少し待ってから一時URLを解放する。
      const url = objectUrl;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  }
}