export function getDisplayImageUrl(
  rawUrl: string | null | undefined,
): string {
  if (!rawUrl) return "";

  if (rawUrl.startsWith("data:image/")) {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    const isBilibiliImage =
      host === "hdslb.com" ||
      host.endsWith(".hdslb.com") ||
      host === "biliimg.com" ||
      host.endsWith(".biliimg.com");

    if (isBilibiliImage) {
      return (
        "/api/image-proxy?url=" +
        encodeURIComponent(rawUrl)
      );
    }
  } catch {
    // 相対URLなどは変更せずそのまま返す。
  }

  return rawUrl;
}