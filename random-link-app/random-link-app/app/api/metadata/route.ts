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
    key: "metadata",
  });

  if (!success) {
    return NextResponse.json(
      { error: "アクセスが集中しています。少し待ってから再試行してください。" },
      { status: 429 }
    );
  }
}
    
    const body = await req.json();
    const url = String(body.url || "").trim();

    if (!url) {
      return NextResponse.json(
        { error: "URLを入力してください。" },
        { status: 400 }
      );
    }

    const meta = await fetchPageMetadata(url);

    return NextResponse.json({
      url: meta.finalUrl,
      title: meta.title,
      thumbnailUrl: meta.thumbnailUrl,
    });
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "ページ情報の取得に失敗しました。";

    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}