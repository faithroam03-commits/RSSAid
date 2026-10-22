"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  deleteClientGenre,
  insertClientGenre,
  renameClientGenre,
  reorderClientGenres,
} from "@/lib/client-db";

function SortableGenreRow({
  genre,
  children,
}: {
  genre: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: genre,
    disabled: genre === "New",
  });

  return (
    <div
      ref={setNodeRef}
style={{
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "8px",
  paddingBottom: "8px",
  borderBottom: "1px solid #ddd",
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
        zIndex: isDragging ? 1 : undefined,
      }}
    >
    {children}
      {genre !== "New" && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${genre}を並べ替え`}
style={{
  cursor: "grab",
  touchAction: "none",
  userSelect: "none",
  width: "48px",
  height: "72px",
  fontSize: "24px",
  flexShrink: 0,
}}
        >
          ⠿
        </button>
      )}
    </div>
  );
}

export default function GenresManager({
  genres,
}: {
  genres: string[];
}) {
  const [items, setItems] = useState(genres);
  const [editingGenre, setEditingGenre] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    })
  );

  async function handleDragEnd(
    event: DragEndEvent
  ) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.indexOf(String(active.id));
    const newIndex = items.indexOf(String(over.id));

    if (oldIndex <= 0 || newIndex <= 0) {
      return;
    }

    const next = arrayMove(
      items,
      oldIndex,
      newIndex
    );

    try {
      await reorderClientGenres(next);
      setItems(next);
      setGenreMessage("");
    } catch {
      setGenreMessage("並び順の保存に失敗しました。");
      setGenreMessageType("error");
    }
  }
  const [newGenre, setNewGenre] = useState("");
  const [genreMessage, setGenreMessage] = useState("");
  const [genreMessageType, setGenreMessageType] =
  useState<"success" | "error" | null>(null);
  
async function add() {
  const name = newGenre.trim();

  if (!name) return;

  if (name === "New" || items.includes(name)) {
setGenreMessage(`「${name}」は既に登録されています。`);
setGenreMessageType("error");
return;
  }

  await insertClientGenre(name);

  setItems([...items, name]);
  setNewGenre("");
  setGenreMessage(`「${name}」を追加しました。`);
  setGenreMessageType("success");
}

function startEdit(name: string) {
  setEditingGenre(name);
  setEditingName(name);
  setGenreMessage("");
}

function cancelEdit() {
  setEditingGenre(null);
  setEditingName("");
  setGenreMessage("");
  setGenreMessageType(null);
}

async function saveEdit() {
  if (editingGenre === null) return;

  try {
    const updatedName = await renameClientGenre(
      editingGenre,
      editingName
    );

    setItems((current) =>
      current.map((name) =>
        name === editingGenre ? updatedName : name
      )
    );

    setEditingGenre(null);
    setEditingName("");
    setGenreMessage(
      `「${editingGenre}」を「${updatedName}」に変更しました。`
    );
    setGenreMessageType("success");
  } catch (error) {
    setGenreMessage(
      error instanceof Error
        ? error.message
        : "ジャンル名の変更に失敗しました。"
    );
    setGenreMessageType("error");
  }
}

async function remove(name: string) {
  if (name === "New") return;

  await deleteClientGenre(name);

  setItems((current) =>
    current.filter((item) => item !== name)
  );
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
{genreMessage && editingGenre === null && (
  <div
    className={genreMessageType === "error" ? "error" : "notice"}
    style={{ marginBottom: "16px" }}
  >
    {genreMessage}
  </div>
)}
     <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items}
          strategy={verticalListSortingStrategy}
        >
          <div>
            {items.map((genre, index) => (
            <SortableGenreRow key={genre} genre={genre}>
            {genre === "New" ? (
  <button type="button" disabled>
    固定
  </button>
) : (
              <>
<div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  }}
>
  <button
    type="button"
    onClick={() => startEdit(genre)}
  >
    編集
  </button>

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
</div>
              </>
            )}

<div style={{ flex: 1, minWidth: 0 }}>
  {editingGenre === genre ? (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <input
        value={editingName}
        onChange={(e) => setEditingName(e.target.value)}
        aria-label={`${genre}の新しいジャンル名`}
      />
      <div
        style={{
          display: "flex",
          gap: "6px",
        }}
      >
        <button type="button" onClick={saveEdit}>
          保存
        </button>
<button type="button" onClick={cancelEdit}>
  キャンセル
</button>
      </div>
      {genreMessage && genreMessageType === "error" && (
        <div className="error">
          {genreMessage}
        </div>
      )}
    </div>
  ) : (
    genre
  )}
</div>
          </SortableGenreRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}