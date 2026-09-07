import { NextResponse } from "next/server";
import { fetchPageMetadata } from "@/lib/fetch-metadata";

export async function POST(req: Request) {
  try {
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