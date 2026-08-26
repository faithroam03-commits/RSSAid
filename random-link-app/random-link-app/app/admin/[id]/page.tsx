import { notFound } from "next/navigation";
import EditLinkForm from "@/components/EditLinkForm";
import { getLink } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getLink(Number(id));
  if (!item) notFound();

  return (
    <>
      <h1>URL編集</h1>
      <EditLinkForm item={item} />
    </>
  );
}
