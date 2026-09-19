import { NextResponse } from "next/server";
import { assertSafeUrl } from "@/lib/fetch-metadata";

const TIMEOUT_MS = 8_000;
const MAX_IMAGE_BYTES = 8_000_000;
const MAX_REDIRECTS = 5;

async function fetchImage(
  rawUrl: string,
  redirectCount = 0,
): Promise<{
  bytes: Uint8Array;
  contentType: string;
}> {
  const safeUrl = await assertSafeUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS,
  );

  try {
    const res = await fetch(safeUrl, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent":
          "RandomLinkApp/0.1 (+personal bookmark preview)",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      if (redirectCount >= MAX_REDIRECTS) {
        throw new Error(
          "画像のリダイレクト回数が多すぎます。",
        );
      }

      const location = res.headers.get("location");

      if (!location) {
        throw new Error(
          "画像のリダイレクト先を取得できません。",
        );
      }

      const nextUrl = new URL(
        location,
        safeUrl,
      ).toString();

      await assertSafeUrl(nextUrl);

      return fetchImage(
        nextUrl,
        redirectCount + 1,
      );
    }

    if (!res.ok) {
      throw new Error(
        `画像を取得できませんでした (${res.status})`,
      );
    }

    const contentType =
      res.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().startsWith("image/")) {
      throw new Error("画像ではないURLです。");
    }

    const contentLength = Number(
      res.headers.get("content-length") ?? "0",
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_IMAGE_BYTES
    ) {
      throw new Error("画像サイズが大きすぎます。");
    }

    const reader = res.body?.getReader();

    if (!reader) {
      throw new Error("画像データを取得できません。");
    }

    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      total += value.byteLength;

      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new Error("画像サイズが大きすぎます。");
      }

      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;

    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return {
      bytes,
      contentType,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    const imageUrl =
      requestUrl.searchParams.get("url")?.trim();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "画像URLが指定されていません。" },
        { status: 400 },
      );
    }

    const { bytes, contentType } =
      await fetchImage(imageUrl);

const body = new Blob(
  [bytes.slice().buffer],
  { type: contentType },
);

return new Response(body, {
  status: 200,
  headers: {
    "content-type": contentType,
    "cache-control":
      "private, max-age=300",
    "x-content-type-options": "nosniff",
  },
});
    
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "画像を取得できませんでした。",
      },
      { status: 400 },
    );
  }
}