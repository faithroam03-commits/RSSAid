import { NextResponse } from "next/server";
import { fetchPageMetadata } from "@/lib/fetch-metadata";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type RateLimitBinding = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export async function POST(req: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });

    const limiter = (env as CloudflareEnv & {
      API_RATE_LIMITER?: RateLimitBinding;
    }).API_RATE_LIMITER;

    if (limiter) {
      const { success } = await limiter.limit({
        key: "scan-images",
      });

      if (!success) {
        return NextResponse.json(
          { error: "アクセスが集中しています。少し待ってから再試行してください。" },
          { status: 429 }
        );
      }
    }
    const body = await req.json();
    const url = String(body.url ?? "").trim();

    if (!url) {
      return NextResponse.json(
        { error: "URLが指定されていません。" },
        { status: 400 }
      );
    }

    const meta = await fetchPageMetadata(url);

    return NextResponse.json({
      title: meta.title,
      images: meta.imageCandidates,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "画像取得に失敗しました。",
      },
      { status: 400 }
    );
  }
}