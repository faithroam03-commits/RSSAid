import { getGenres } from "@/lib/db";
import GenresManager from "@/components/GenresManager";

export const dynamic = "force-dynamic";

export default function GenresPage() {
  const genres = getGenres();

  return (
    <>
      <h1>ジャンル管理</h1>
      <GenresManager genres={genres} />
    </>
  );
}