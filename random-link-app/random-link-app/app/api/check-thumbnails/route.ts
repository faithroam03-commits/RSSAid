import { NextResponse } from "next/server";
import { fetchPageMetadata } from "@/lib/fetch-metadata";

const MAX_ITEMS = 200;

type CheckItem = {
  id: number;
  url: string;
  thumbnailUrl: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { error: "確認対象が指定されていません。" },
        { status: 400 },
      );
    }

    if (body.items.length > MAX_ITEMS) {
      return NextResponse.json(
        {
          error: `一度に確認できるカードは${MAX_ITEMS}件までです。`,
        },
        { status: 400 },
      );
    }

    const results = [];

    for (const rawItem of body.items) {
      const item: CheckItem = {
        id: Number(rawItem.id),
        url: String(rawItem.url ?? "").trim(),
        thumbnailUrl: String(rawItem.thumbnailUrl ?? "").trim(),
      };

      if (!item.url || !item.thumbnailUrl) {
        continue;
      }

if (item.thumbnailUrl.startsWith("data:image/")) {
  try {
    const meta = await fetchPageMetadata(item.url);

    const candidates = Array.from(
      new Set(
        [
          meta.thumbnailUrl,
          ...meta.imageCandidates,
        ].filter(
          (value): value is string =>
            typeof value === "string" &&
            value.length > 0,
        ),
      ),
    ).slice(0, 10);

    results.push({
      id: item.id,
      status:
        candidates.length > 0
          ? "embedded"
          : "unverifiable",
      candidates,
    });
  } catch {
    results.push({
      id: item.id,
      status: "unverifiable",
      candidates: [],
    });
  }

  continue;
}

      try {
        const meta = await fetchPageMetadata(item.url);

        const candidates = new Set(
          [
            meta.thumbnailUrl,
            ...meta.imageCandidates,
          ].filter(
            (value): value is string =>
              typeof value === "string" && value.length > 0,
          ),
        );

        const matched = candidates.has(item.thumbnailUrl);

        results.push({
          id: item.id,
          status: matched ? "matched" : "not_found",
        });
      } catch {
        results.push({
          id: item.id,
          status: "unverifiable",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "サムネイル画像を確認できませんでした。",
      },
      { status: 500 },
    );
  }
}