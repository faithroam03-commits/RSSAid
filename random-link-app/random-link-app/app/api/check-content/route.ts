import { NextResponse } from "next/server";
import { checkSafeSearch } from "@/lib/check-safe-search";

const MAX_IMAGES = 30;

type RateLimitBinding = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

type ContentCheckItem = {
  id: number;
  imageUrl: string;
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
        VISION_RATE_LIMITER?: RateLimitBinding;
      }).VISION_RATE_LIMITER;
    }

    if (limiter) {
      const { success } = await limiter.limit({
        key: "check-content",
      });

      if (!success) {
        return NextResponse.json(
          {
            error:
              "コンテンツ確認が集中しています。少し待ってから再試行してください。",
          },
          { status: 429 },
        );
      }
    }

    const body = await req.json();

    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { error: "画像一覧が指定されていません。" },
        { status: 400 },
      );
    }

    const items: ContentCheckItem[] = body.items
      .map((item: unknown) => {
        if (
          typeof item !== "object" ||
          item === null ||
          !("id" in item) ||
          !("imageUrl" in item)
        ) {
          return null;
        }

        const value = item as {
          id: unknown;
          imageUrl: unknown;
        };

        if (
          typeof value.id !== "number" ||
          typeof value.imageUrl !== "string" ||
          !value.imageUrl.trim()
        ) {
          return null;
        }

        return {
          id: value.id,
          imageUrl: value.imageUrl.trim(),
        };
      })
      .filter(
        (item: ContentCheckItem | null): item is ContentCheckItem =>
          item !== null,
      );

    if (items.length === 0) {
      return NextResponse.json({
        results: [],
        r18Count: 0,
        violenceCount: 0,
        bugCount: 0,
        unverifiableCount: 0,
      });
    }

    if (items.length > MAX_IMAGES) {
      return NextResponse.json(
        {
          error: `一度に確認できる画像は${MAX_IMAGES}件までです。`,
        },
        { status: 400 },
      );
    }

const results = [];

for (const item of items) {
  try {
    const safeSearch = await checkSafeSearch(item.imageUrl);

    results.push({
      id: item.id,
      r18: safeSearch.r18,
      violent: safeSearch.violent,
      bug: safeSearch.bug,
      unverifiable: false,
    });
  } catch (error) {
    console.error(
      `Cloud Vision check failed for item ${item.id}:`,
      error,
    );

    results.push({
      id: item.id,
      r18: false,
      violent: false,
      bug: false,
      unverifiable: true,
    });
  }
}

    const r18Count = results.filter((item) => item.r18).length;
    const violenceCount = results.filter((item) => item.violent).length;
    const bugCount = results.filter((item) => item.bug).length;
    const unverifiableCount = results.filter(
    (item) => item.unverifiable,
    ).length;
    
return NextResponse.json({
  results,
  r18Count,
  violenceCount,
  bugCount,
  unverifiableCount,
});
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "画像の安全性を確認できませんでした。",
      },
      { status: 500 },
    );
  }
}