import AdminClient from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    genre?: string;
    q?: string;
    sort?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;

  const selectedGenre = params.genre;
  const query = (params.q ?? "").trim();
  const sort = params.sort ?? "newest";
  const status = params.status ?? "all";

  return (
    <AdminClient
      selectedGenre={selectedGenre}
      query={query}
      sort={sort}
      status={status}
    />
  );
}