import { NextResponse } from "next/server";
import { fetchPageMetadata } from "@/lib/fetch-metadata";

export async function POST(req: Request) {
  try {
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