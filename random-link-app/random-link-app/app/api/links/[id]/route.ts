import { NextResponse } from "next/server";
import { deleteLink, updateLink } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const imageFit =
  body.imageFit === "contain" ? "contain" : "cover";
    const url = String(body.url || "").trim();
    const title = String(body.title || "").trim();
    const genre = String(body.genre || "New").trim();
    const thumbnailUrl = String(body.thumbnailUrl || "").trim();

    if (!url || !title) {
      return NextResponse.json({ error: "URLとタイトルは必須です。" }, { status: 400 });
    }
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "http / https のURLのみ保存できます。" }, { status: 400 });
    }

    updateLink({
  id: Number(id),
  url,
  title,
  thumbnailUrl: thumbnailUrl || null,
  imageFit,
  genre,
  enabled: Boolean(body.enabled),
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const message =
      e?.code === "SQLITE_CONSTRAINT_UNIQUE"
        ? "このURLはすでに登録されています。"
        : e instanceof Error ? e.message : "保存に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteLink(Number(id));
  return NextResponse.json({ ok: true });
}
