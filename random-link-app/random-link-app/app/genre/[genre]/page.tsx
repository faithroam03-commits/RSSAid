import RandomCard from "@/components/RandomCard";
import { randomLink } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function GenrePage({
  params
}: {
  params: Promise<{ genre: string }>
}) {
  const { genre } = await params;
  const decoded = decodeURIComponent(genre);
  return (
    <>
      <h1>{decoded}</h1>
      <RandomCard item={randomLink(decoded)} />
    </>
  );
}
