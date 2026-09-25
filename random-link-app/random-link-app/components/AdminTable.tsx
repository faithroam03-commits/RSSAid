"use client";

import type { LinkRecord } from "@/lib/types";

type Props = {
  links: LinkRecord[];
  onDelete: (id: number) => Promise<void>;
  bulkMode: boolean;
  selectedIds: Set<number>;
  onToggleSelected: (id: number) => void;
};

export default function AdminTable({
  links,
  onDelete,
  bulkMode,
  selectedIds,
  onToggleSelected,
}: Props) {
  async function remove(id: number) {
    if (!confirm("このURLを削除しますか？")) {
      return;
    }

    try {
      await onDelete(id);
    } catch {
      alert("削除に失敗しました。");
    }
  }

  return (
  <>
    <div className="adminDesktop">
      <div className="panel table-wrap">
        <table>
          <thead>
<tr>
  {bulkMode && <th>選択</th>}
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
  {bulkMode && (
    <td>
      <input
        type="checkbox"
        checked={selectedIds.has(item.id)}
        onChange={() =>
          onToggleSelected(item.id)
        }
        aria-label={`${item.title}を選択`}
      />
    </td>
  )}

  <td>
                  {item.thumbnail_url ? (
                    <img
                      className="mini-thumb"
                      src={item.thumbnail_url}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
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
                    <a className="btn" href={`/admin/${item.id}`}>
                      編集
                    </a>

                    <button
                      className="btn danger"
                      onClick={() => remove(item.id)}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

<div className="adminMobile">
  {links.map((item) => (
    <div className="panel adminCard" key={item.id}>
      {bulkMode && (
        <label className="adminBulkCheck">
          <input
            type="checkbox"
            checked={selectedIds.has(item.id)}
            onChange={() =>
              onToggleSelected(item.id)
            }
            aria-label={`${item.title}を選択`}
          />
        </label>
      )}

      <div className="adminCardTop">
            {item.thumbnail_url ? (
              <img
                className="adminCardThumb"
                src={item.thumbnail_url}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="adminCardThumb" />
            )}

            <div className="adminCardInfo">
              <strong>{item.title}</strong>
              <div className="small adminCardUrl">{item.url}</div>
            </div>
          </div>

          <div className="adminCardMeta">
            <span>{item.genre}</span>
            <span>{item.enabled ? "有効" : "無効"}</span>
          </div>

          <div className="actions">
            <a className="btn" href={`/admin/${item.id}`}>
              編集
            </a>

            <button
              className="btn danger"
              onClick={() => remove(item.id)}
            >
              削除
            </button>
          </div>
        </div>
      ))}
    </div>

    {!links.length && (
      <div className="empty">登録URLはありません。</div>
    )}
  </>
);
}
