import AdminTable from "@/components/AdminTable";
import { listLinks } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const links = listLinks();
  return (
    <>
      <h1>URLメンテナンス</h1>
      <p className="small">現在 {links.length} 件登録されています。</p>
      <AdminTable links={links} />
    </>
  );
}
