"use client";

import { useRouter } from "next/navigation";
import type { LinkRecord } from "@/lib/types";

export default function AdminTable({ links }: { links: LinkRecord[] }) {
  const router = useRouter();

  async function remove(id: number) {
    if (!confirm("このURLを削除しますか？")) return;
    const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
    if (!res.ok) alert("削除に失敗しました。");
    router.refresh();
  }

  return (
    <div className="panel table-wrap">
      <table>
        <thead>
          <tr>
            <th>画像</th>
            <th>タイトル / URL</th>
            <th>ジャンル</th>
            <th>状態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {links.map((item) => (
            <tr key={item.id}>
              <td>
                {item.thumbnail_url ? (
                  <img className="mini-thumb" src={item.thumbnail_url} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <div className="mini-thumb" />
                )}
              </td>
              <td className="admin-row-title">
                <strong>{item.title}</strong>
                <div className="small">{item.url}</div>
              </td>
              <td>{item.genre}</td>
              <td>{item.enabled ? "有効" : "無効"}</td>
              <td>
                <div className="actions">
                  <a className="btn" href={`/admin/${item.id}`}>編集</a>
                  <button className="btn danger" onClick={() => remove(item.id)}>削除</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!links.length && <div className="empty">登録URLはありません。</div>}
    </div>
  );
}
