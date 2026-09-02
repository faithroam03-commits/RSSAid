import { NextResponse } from "next/server";
import { getLinkByUrl } from "@/lib/db";
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

const existing = getLinkByUrl(url);

if (existing) {
  return NextResponse.json(
    { error: "このURLはすでに登録されています。" },
    { status: 409 }
  );
}
    
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