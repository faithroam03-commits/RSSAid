import Link from "next/link";
import { getGenres } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function GenresPage() {
  const genres = getGenres().filter((x) => x !== "新規登録");
  return (
    <>
      <h1>ジャンル</h1>
      <div className="grid">
        {genres.map((genre) => (
          <Link className="genre" href={`/genre/${encodeURIComponent(genre)}`} key={genre}>
            {genre}
          </Link>
        ))}
      </div>
      {!genres.length && <div className="panel empty">管理画面でジャンルを設定すると、ここに表示されます。</div>}
    </>
  );
}
