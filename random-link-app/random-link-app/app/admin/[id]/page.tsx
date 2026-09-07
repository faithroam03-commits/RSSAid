import EditPageClient from "@/components/EditPageClient";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  return (
    <EditPageClient
      id={Number(id)}
    />
  );
}