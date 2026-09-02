import { NextResponse } from "next/server";
import { insertLink } from "@/lib/db";
import { fetchPageMetadata } from "@/lib/fetch-metadata";

export async function POST(req: Request) {
  try {
const body = await req.json();

const url = String(body.url || "").trim();
const genre = String(body.genre || "New").trim() || "New";
const title = String(body.title || "").trim();
const thumbnailUrl = String(body.thumbnailUrl || "").trim();

if (!url) {
  return NextResponse.json(
    { error: "URLを入力してください。" },
    { status: 400 }
  );
}

const meta = await fetchPageMetadata(url);

const finalTitle = title || meta.title;
const finalThumbnailUrl = thumbnailUrl || meta.thumbnailUrl;

const id = insertLink({
  url: meta.finalUrl,
  title: finalTitle,
  thumbnailUrl: finalThumbnailUrl,
  genre,
});

return NextResponse.json({
  id,
  title: finalTitle,
});
    
  } catch (e: any) {
    const message =
      e?.code === "SQLITE_CONSTRAINT_UNIQUE"
        ? "このURLはすでに登録されています。"
        : e instanceof Error
          ? e.message
          : "登録に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
