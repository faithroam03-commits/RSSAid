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

export async function insertClientGenre(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("ジャンル名を入力してください。");
  }

  const db = await getClientDb();
  const genres = await db.getAll("genres");

  const existing = genres.find(
    (item) => item.name === trimmedName
  );

  if (existing) {
    return existing.name;
  }

  const maxSortOrder = genres.reduce(
    (max, item) => Math.max(max, item.sort_order),
    0
  );

  await db.add("genres", {
    id: Date.now(),
    name: trimmedName,
    sort_order: maxSortOrder + 1,
  });

  return trimmedName;
}

export type ClientLinkUpdate = {
  url?: string;
  title?: string;
  thumbnailUrl?: string | null;
  imageFit?: "cover" | "contain";
  genre?: string;
  enabled?: number;
};

export async function updateClientLink(
  id: number,
  input: ClientLinkUpdate
) {
  const db = await getClientDb();

  const current = await db.get("links", id);

  if (!current) {
    throw new Error("更新対象のURLが見つかりません。");
  }

  if (input.url && input.url !== current.url) {
    const links = await db.getAll("links");

    const duplicate = links.some(
      (item) =>
        item.id !== id &&
        item.url === input.url
    );

    if (duplicate) {
      throw new Error("このURLはすでに登録されています。");
    }
  }

  const updated = {
    ...current,
    url: input.url ?? current.url,
    title: input.title ?? current.title,
    thumbnail_url:
      input.thumbnailUrl !== undefined
        ? input.thumbnailUrl
        : current.thumbnail_url,
    image_fit: input.imageFit ?? current.image_fit,
    genre: input.genre ?? current.genre,
    enabled: input.enabled ?? current.enabled,
    updated_at: new Date().toISOString(),
  };

  await db.put("links", updated);

  return updated;
}

export async function deleteClientLink(id: number) {
  const db = await getClientDb();

  const current = await db.get("links", id);

  if (!current) {
    throw new Error("削除対象のURLが見つかりません。");
  }

  await db.delete("links", id);
}
export async function deleteClientGenre(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("ジャンル名が指定されていません。");
  }

  if (trimmedName === "New") {
    throw new Error("New は削除できません。");
  }

  const db = await getClientDb();

  const genres = await db.getAll("genres");
  const target = genres.find(
    (item) => item.name === trimmedName
  );

  if (!target) {
    throw new Error("削除対象のジャンルが見つかりません。");
  }

  const links = await db.getAll("links");

  const tx = db.transaction(
    ["links", "genres"],
    "readwrite"
  );

  for (const link of links) {
    if (link.genre === trimmedName) {
      await tx.objectStore("links").put({
        ...link,
        genre: "New",
        updated_at: new Date().toISOString(),
      });
    }
  }

  await tx.objectStore("genres").delete(target.id);

  await tx.done;
}

export async function moveClientGenre(
  name: string,
  direction: "up" | "down"
) {
  if (name === "New") {
    throw new Error("New は移動できません。");
  }

  const db = await getClientDb();
  const genres = await db.getAll("genres");

  const sorted = genres.sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.id - b.id
  );

  const index = sorted.findIndex(
    (item) => item.name === name
  );

  if (index === -1) {
    throw new Error("移動対象のジャンルが見つかりません。");
  }

  const targetIndex =
    direction === "up"
      ? index - 1
      : index + 1;

  if (
    targetIndex < 0 ||
    targetIndex >= sorted.length
  ) {
    return;
  }

  const target = sorted[index];
  const other = sorted[targetIndex];

  if (other.name === "New") {
    return;
  }

  const tx = db.transaction(
    "genres",
    "readwrite"
  );

  await tx.store.put({
    ...target,
    sort_order: other.sort_order,
  });

  await tx.store.put({
    ...other,
    sort_order: target.sort_order,
  });

  await tx.done;
}

export async function getClientLink(id: number) {
  const db = await getClientDb();
  return db.get("links", id);
}

export async function getRandomClientLinks(
  count: number,
  genre?: string
) {
  const db = await getClientDb();

  const allLinks = await db.getAll("links");

  const filtered = allLinks.filter((item) => {
    if (item.enabled !== 1) {
      return false;
    }

    if (genre && genre !== "ALL") {
      return item.genre === genre;
    }

    return true;
  });

  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [
      filtered[j],
      filtered[i],
    ];
  }

  return filtered.slice(0, count);
}