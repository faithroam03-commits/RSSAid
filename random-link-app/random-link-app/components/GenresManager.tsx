"use client";

import { useState } from "react";

export default function GenresManager({
  genres,
}: {
  genres: string[];
}) {
  const [items, setItems] = useState(genres);
  const [newGenre, setNewGenre] = useState("");

async function move(index: number, direction: -1 | 1) {
  const target = index + direction;

  if (target < 1 || target >= items.length) return;

  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];

  setItems(next);

  await fetch("/api/genres", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      action: "reorder",
      names: next,
    }),
  });
}

  async function add() {
  const name = newGenre.trim();

  if (!name || name === "New" || items.includes(name)) return;

  await fetch("/api/genres", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      action: "add",
      name,
    }),
  });

  setItems([...items, name]);
  setNewGenre("");
}

async function remove(name: string) {
  if (name === "New") return;

  await fetch("/api/genres", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      action: "delete",
      name,
    }),
  });

  setItems(items.filter((item) => item !== name));
}
  
  return (
    <div className="panel">
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
        }}
      >
        <input
          value={newGenre}
          onChange={(e) => setNewGenre(e.target.value)}
          placeholder="新規ジャンル名"
        />

      <button type="button" onClick={add}>
       +
      </button>
        
      </div>

      <div>
        {items.map((genre, index) => (
          <div
            key={genre}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "10px",
            }}
          >
            <div style={{ flex: 1 }}>
              {genre}
            </div>

            {genre === "New" ? (
              <span>固定</span>
            ) : (
              <>
<button
  type="button"
  onClick={() => {
const ok = window.confirm(
  `「${genre}」を削除しますか？\n\nこのジャンルに登録されているURLはNewへ移動します。`
);

  if (ok) {
    remove(genre);
  }
}}
>
  削除
</button>

                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index <= 1}
                >
                  ↑
                </button>

                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index >= items.length - 1}
                >
                  ↓
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}