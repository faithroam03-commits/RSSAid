"use client";

import { openDB, type DBSchema } from "idb";

interface ThumbnailHistoryDB extends DBSchema {
  saved: {
    key: number;
    value: {
      cardId: number;
      savedAt: string;
      filename: string;
    };
  };
}

const DB_NAME = "random-link-thumbnail-history";

function getHistoryDb() {
  return openDB<ThumbnailHistoryDB>(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore("saved", {
        keyPath: "cardId",
      });
    },
  });
}

export async function saveThumbnailHistory(
  cardId: number,
  filename: string
): Promise<void> {
  const db = await getHistoryDb();

  try {
    await db.put("saved", {
      cardId,
      filename,
      savedAt: new Date().toISOString(),
    });
  } finally {
    db.close();
  }
}

export async function getSavedThumbnailIds():
  Promise<number[]> {
  const db = await getHistoryDb();

  try {
    return await db.getAllKeys("saved");
  } finally {
    db.close();
  }
}

export async function getSavedThumbnailCount():
  Promise<number> {
  const db = await getHistoryDb();

  try {
    return await db.count("saved");
  } finally {
    db.close();
  }
}

export async function clearSelectedThumbnailHistory(
  cardIds: number[]
): Promise<void> {
  const db = await getHistoryDb();

  try {
    const tx = db.transaction("saved", "readwrite");

    for (const cardId of cardIds) {
      await tx.store.delete(cardId);
    }

    await tx.done;
  } finally {
    db.close();
  }
}

export async function clearAllThumbnailHistory():
  Promise<void> {
  const db = await getHistoryDb();

  try {
    await db.clear("saved");
  } finally {
    db.close();
  }
}