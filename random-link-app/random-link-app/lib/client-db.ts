"use client";

import { openDB, type DBSchema } from "idb";

interface RandomLinkDB extends DBSchema {
  links: {
    key: number;
    value: {
      id: number;
      url: string;
      title: string;
      thumbnail_url: string | null;
      image_fit: "cover" | "contain";
      genre: string;
      enabled: number;
      created_at: string;
      updated_at: string;
    };
    indexes: {
      "by-genre": string;
      "by-enabled": number;
    };
  };

  genres: {
    key: number;
    value: {
      id: number;
      name: string;
      sort_order: number;
    };
    indexes: {
      "by-sort-order": number;
    };
  };
}

function getClientDb() {
  return openDB<RandomLinkDB>(
    "random-link-db",
    1,
    {
      upgrade(db) {
        const links = db.createObjectStore("links", {
          keyPath: "id",
          autoIncrement: true,
        });

        links.createIndex("by-genre", "genre");
        links.createIndex("by-enabled", "enabled");

        const genres = db.createObjectStore("genres", {
          keyPath: "id",
          autoIncrement: true,
        });

        genres.createIndex("by-sort-order", "sort_order");
      },
    }
  );
}
export async function ensureDefaultGenre() {
  const db = await getClientDb();

  const genres = await db.getAll("genres");

  const hasNew = genres.some((item) => item.name === "New");

  if (!hasNew) {
    await db.add("genres", {
      id: Date.now(),
      name: "New",
      sort_order: 0,
    });
  }
}

export async function getClientGenres(): Promise<string[]> {
  const db = await getClientDb();

  await ensureDefaultGenre();

  const genres = await db.getAll("genres");

  return genres
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map((item) => item.name);
}

export async function addClientLink() {
  const db = await getClientDb();
  const now = new Date().toISOString();

  await db.add("links", {
    id: Date.now(),
    url: "https://example.com/",
    title: "IndexedDBテスト",
    thumbnail_url: null,
    image_fit: "cover",
    genre: "New",
    enabled: 1,
    created_at: now,
    updated_at: now,
  });
}

export async function getClientLinks() {
  const db = await getClientDb();
  return db.getAll("links");
}

export type ClientLinkInput = {
  url: string;
  title: string;
  thumbnailUrl?: string | null;
  imageFit?: "cover" | "contain";
  genre?: string;
};

export async function insertClientLink(input: ClientLinkInput) {
  const db = await getClientDb();
  const now = new Date().toISOString();

  const existingLinks = await db.getAll("links");
  const duplicate = existingLinks.some(
    (item) => item.url === input.url
  );

  if (duplicate) {
    throw new Error("このURLはすでに登録されています。");
  }

  const id = Date.now();

  await db.add("links", {
    id,
    url: input.url,
    title: input.title,
    thumbnail_url: input.thumbnailUrl ?? null,
    image_fit: input.imageFit ?? "cover",
    genre: input.genre ?? "New",
    enabled: 1,
    created_at: now,
    updated_at: now,
  });

  return id;
}