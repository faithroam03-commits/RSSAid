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
        marginBottom: "10px",
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
{genreMessage && (
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
              </>
            )}

            <div style={{ flex: 1 }}>
              {genre}
            </div>
          </SortableGenreRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}