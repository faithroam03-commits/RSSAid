import { NextResponse } from "next/server";
import { getLink } from "@/lib/db";
import { fetchPageMetadata } from "@/lib/fetch-metadata";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = getLink(Number(id));
    if (!item) return NextResponse.json({ error: "URLが見つかりません。" }, { status: 404 });

    const meta = await fetchPageMetadata(item.url);
    return NextResponse.json({
      title: meta.title,
      images: meta.imageCandidates
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "画像取得に失敗しました。" },
      { status: 400 }
    );
  }
}
