import Link from "next/link";
import RandomGrid from "@/components/RandomGrid";
import { getGenres, randomLinks } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    genre?: string;
    r?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedGenre = params.genre;
  const genres = getGenres();

const items = randomLinks(30, selectedGenre);

  return (
    <>
      <nav className="genreTabs">
        <Link
          href="/"
          className={`genreTab ${!selectedGenre ? "active" : ""}`}
        >
          ALL
        </Link>

        {genres.map((genre) => (
          <Link
            key={genre}
            href={`/?genre=${encodeURIComponent(genre)}`}
            className={`genreTab ${
              selectedGenre === genre ? "active" : ""
            }`}
          >
            {genre}
          </Link>
        ))}
      </nav>

      <RandomGrid items={items} genre={selectedGenre} />
    </>
  );
}