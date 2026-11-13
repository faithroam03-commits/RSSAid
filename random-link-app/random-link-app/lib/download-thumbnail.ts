import { getWritableDownloadFolder } from "@/lib/download-folder";

export type ThumbnailDownloadResult =
  | {
      ok: true;
      fileName: string;
      saveMethod: "folder" | "browser";
    }
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
  title: string,
  cardId?: number | string,
  candidateNumber?: number,
  genreName?: string
): Promise<ThumbnailDownloadResult> {
  if (!imageUrl.trim()) {
    return { ok: false, error: "サムネイルがありません。" };
  }

let objectUrl: string | null = null;
let errorStage = "保存先フォルダの確認";

  try {
  // 画像取得前に保存先フォルダの権限を確認する。
  const targetFolder = await getWritableDownloadFolder();

  let fetchUrl = imageUrl;

    try {
      const parsed = new URL(imageUrl);

const hostname = parsed.hostname.toLowerCase();

if (
  parsed.protocol === "https:" &&
  (
    hostname === "i.pinimg.com" ||
    hostname === "cache2-ebookjapan.akamaized.net" ||
    hostname === "www.gamespark.jp"
  )
) {
  fetchUrl =
    "/api/image-proxy?url=" +
    encodeURIComponent(imageUrl);
}
    } catch {
      // Data URLや相対URLはそのまま扱う。
    }

errorStage = fetchUrl.startsWith("/api/image-proxy")
  ? "画像取得（プロキシ）"
  : "画像取得（直接）";

const response = await fetch(fetchUrl);

    if (!response.ok) {
      throw new Error(`画像取得に失敗しました（${response.status}）。`);
    }

    const blob = await response.blob();

    if (!blob.type.toLowerCase().startsWith("image/")) {
      throw new Error("取得したファイルが画像ではありません。");
    }

errorStage = "保存先へのファイル書き込み";

const extension = extensionFromType(blob.type);

const candidateSuffix =
  candidateNumber !== undefined
    ? `_${String(candidateNumber).padStart(2, "0")}`
    : "";

const genrePart = genreName?.trim()
  ? `${safeFileName(genreName)}_`
  : "";

const baseFileName =
  typeof cardId === "number"
    ? `RL_${genrePart}ID${cardId}${candidateSuffix}`
    : typeof cardId === "string"
      ? `RL_PRE${cardId}${candidateSuffix}`
      : `${safeFileName(title)}_${timestamp()}_${crypto.randomUUID().slice(0, 8)}${candidateSuffix}`;

let fileName = `${baseFileName}.${extension}`;

// 保存先が設定されている場合は直接書き込む。
if (targetFolder) {
  // 同名ファイルが存在する場合は連番を付ける。
  let duplicateNumber = 2;

  while (true) {
    try {
      await targetFolder.getFileHandle(fileName);

      fileName =
        `${baseFileName}-${duplicateNumber}.${extension}`;

      duplicateNumber++;
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "NotFoundError"
      ) {
        break;
      }

      throw error;
    }
  }

  const fileHandle = await targetFolder.getFileHandle(
    fileName,
    { create: true }
  );

  const writable = await fileHandle.createWritable();

  try {
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => {});
    throw error;
  }

return {
  ok: true,
  fileName,
  saveMethod: "folder",
};
}

// 保存先未設定の場合は従来のダウンロード方式。
objectUrl = URL.createObjectURL(blob);

const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

return {
  ok: true,
  fileName,
  saveMethod: "browser",
};
  } catch (error) {
const detail =
  error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);

return {
  ok: false,
  error: `${errorStage}で失敗しました。\n${detail}`,
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