import { NextResponse } from "next/server";
import { checkWebRisk } from "@/lib/check-web-risk";

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
        API_RATE_LIMITER?: RateLimitBinding;
      }).API_RATE_LIMITER;
    }

    if (limiter) {
      const { success } = await limiter.limit({
        key: "check-url",
      });

      if (!success) {
        return NextResponse.json(
          {
            error:
              "アクセスが集中しています。少し待ってから再試行してください。",
          },
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

    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json(
        { error: "HTTPまたはHTTPSのURLを指定してください。" },
        { status: 400 }
      );
    }

    const risk = await checkWebRisk(url);

    if (!risk.safe) {
      return NextResponse.json(
        {
          error: "安全でない可能性があるURLのため保存できません。",
          errorCode: "UNSAFE_URL",
          threatTypes: risk.threatTypes,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ safe: true });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "URLの安全性を確認できませんでした。",
        errorCode: "SAFETY_CHECK_FAILED",
      },
      { status: 503 }
    );
  }
}
