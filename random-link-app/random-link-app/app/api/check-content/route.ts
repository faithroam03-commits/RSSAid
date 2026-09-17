import { NextResponse } from "next/server";
import { checkSafeSearch } from "@/lib/check-safe-search";

const MAX_IMAGES = 200;

type ContentCheckItem = {
  id: number;
  imageUrl: string;
};

export async function POST(req: Request) {
  try {
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
      const safeSearch = await checkSafeSearch(item.imageUrl);

      results.push({
        id: item.id,
        r18: safeSearch.r18,
        violent: safeSearch.violent,
      });
    }

    const r18Count = results.filter((item) => item.r18).length;
    const violenceCount = results.filter((item) => item.violent).length;

    return NextResponse.json({
      results,
      r18Count,
      violenceCount,
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
