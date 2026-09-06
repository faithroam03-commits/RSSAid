import HomeClient from "@/components/HomeClient";

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

  return (
    <HomeClient
      selectedGenre={selectedGenre}
    />
  );
}