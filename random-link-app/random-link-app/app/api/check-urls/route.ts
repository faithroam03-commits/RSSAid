import { NextResponse } from "next/server";
import { checkWebRisk } from "@/lib/check-web-risk";

const MAX_URLS = 100;

type RateLimitBinding = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export async function POST(req: Request) {
  try {
    let limiter: RateLimitBinding | undefined;

    if (process.env.NODE_ENV === "production") {
      const { getCloudflareContext } = await import(
        "@opennextjs/cloudflare"
      );

      const { env } = await getCloudflareContext({ async: true });

      limiter = (env as CloudflareEnv & {
        WEB_RISK_RATE_LIMITER?: RateLimitBinding;
      }).WEB_RISK_RATE_LIMITER;
    }

    if (limiter) {
      const { success } = await limiter.limit({
        key: "check-urls",
      });

      if (!success) {
        return NextResponse.json(
          {
            error:
    "URLの安全確認が集中しています。少し待ってから再試行してください。",
          },
          { status: 429 },
        );
      }
    }

    const body = await req.json();

    if (!Array.isArray(body.urls)) {
      return NextResponse.json(
        { error: "URL一覧が指定されていません。" },
        { status: 400 }
      );
    }

    const urls = body.urls
      .map((value: unknown) => String(value).trim())
      .filter(Boolean);

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "確認するURLがありません。" },
        { status: 400 }
      );
    }

    if (urls.length > MAX_URLS) {
      return NextResponse.json(
        {
          error: `一度に確認できるURLは${MAX_URLS}件までです。`,
        },
        { status: 400 }
      );
    }

    const results = [];

    for (const url of urls) {
      const risk = await checkWebRisk(url);

      results.push({
        url,
        safe: risk.safe,
        threatTypes: risk.threatTypes,
      });
    }

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "URLの安全性を確認できませんでした。",
      },
      { status: 500 }
    );
  }
}