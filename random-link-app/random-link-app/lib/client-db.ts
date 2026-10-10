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
media_id?: number | null;
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

  media: {
    key: number;
    value: {
      id: number;
      blob: Blob;
      filename: string;
      mime_type: string;
      created_at: string;
    };
  };
}

function getClientDb() {
  return openDB<RandomLinkDB>(
    "random-link-db",
    2,
    {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
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

          const now = new Date().toISOString();
          const initialId = Date.now();

          genres.add({
            id: initialId,
            name: "New",
            sort_order: 0,
          });

          links.add({
            id: initialId + 1,
            url: "/help",
            title: "Random Linkの使い方",
            thumbnail_url: "/help/random-link-guide.png",
            image_fit: "contain",
            genre: "New",
            enabled: 1,
            created_at: now,
            updated_at: now,
          });
        }

        if (oldVersion < 2) {
          db.createObjectStore("media", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      },
    }
  );
}

export async function ensureDefaultGenre() {
  const db = await getClientDb();

  const tx = db.transaction("genres", "readwrite");
  const genres = await tx.store.getAll();

  const newGenres = genres
    .filter((item) => item.name === "New")
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        a.id - b.id
    );

  if (newGenres.length === 0) {
    await tx.store.add({
      id: Date.now(),
      name: "New",
      sort_order: 0,
    });
  } else if (newGenres.length > 1) {
    for (const duplicate of newGenres.slice(1)) {
      await tx.store.delete(duplicate.id);
    }
  }

  await tx.done;
}


export async function getClientGenres(): Promise<string[]> {
  const db = await getClientDb();

  await ensureDefaultGenre();

  const genres = await db.getAll("genres");

  return genres
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map((item) => item.name);
}

export async function getClientGenreRecords() {
  const db = await getClientDb();

  await ensureDefaultGenre();

  return db.getAll("genres");
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
  mediaId?: number | null;
  genre?: string;
};

export async function insertClientLink(input: ClientLinkInput) {
  const finalGenre = input.genre ?? "New";

  await insertClientGenre(finalGenre);

  const db = await getClientDb();
  const now = new Date().toISOString();

  const id = Date.now();

  await db.add("links", {
    id,
    url: input.url,
    title: input.title,
thumbnail_url: input.thumbnailUrl ?? null,
image_fit: input.imageFit ?? "cover",
media_id: input.mediaId ?? null,
genre: finalGenre,
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

  const tx = db.transaction(
    ["links", "media"],
    "readwrite"
  );

  const current = await tx.objectStore("links").get(id);

  if (!current) {
    tx.abort();
    throw new Error("削除対象のURLが見つかりません。");
  }

  await tx.objectStore("links").delete(id);

  if (current.media_id != null) {
    await tx.objectStore("media").delete(current.media_id);
  }

  await tx.done;
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

export async function hasClientLinkByUrl(url: string) {
  const db = await getClientDb();
  const links = await db.getAll("links");

  return links.some((item) => item.url === url);
}
export type ClientSharedGenreData = {
  version: 1;
  genreName: string;
  exportedAt?: string;
  links: Array<{
    url: string;
    title: string;
    thumbnail_url: string | null;
    image_fit: "cover" | "contain";
  }>;
};
export async function exportClientGenre(
  genreName: string
): Promise<ClientSharedGenreData> {
  const db = await getClientDb();

  const links = await db.getAllFromIndex(
    "links",
    "by-genre",
    genreName
  );

  return {
    version: 1,
    genreName,
    exportedAt: new Date().toISOString(),
    links: links.map((link) => ({
      url: link.url,
      title: link.title,
      thumbnail_url: link.thumbnail_url,
      image_fit: link.image_fit,
    })),
  };
}

export async function importClientSharedGenre(
  data: ClientSharedGenreData,
  genreName: string,
  safeUrls: string[],
  excludedIndexes: number[] = []
) {
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.links)
  ) {
    throw new Error("対応していない共有ジャンルファイルです。");
  }

  const targetGenre = genreName.trim();

  if (!targetGenre) {
    throw new Error("取り込み先ジャンル名を入力してください。");
  }

  const safeUrlSet = new Set(safeUrls);
  const excludedIndexSet = new Set(excludedIndexes);
  const db = await getClientDb();

  const existingLinks = await db.getAll("links");
  const existingGenres = await db.getAll("genres");

  let nextId = Math.max(
    Date.now(),
    ...existingLinks.map((item) => item.id + 1),
    ...existingGenres.map((item) => item.id + 1)
  );

  const existingGenre = existingGenres.find(
    (item) => item.name === targetGenre
  );

  let addedGenre = false;

  if (!existingGenre) {
    const maxSortOrder = existingGenres.reduce(
      (max, item) => Math.max(max, item.sort_order),
      0
    );

    await db.add("genres", {
      id: nextId++,
      name: targetGenre,
      sort_order: maxSortOrder + 1,
    });

    addedGenre = true;
  }

  let addedLinks = 0;

  for (const [index, link] of data.links.entries()) {
    if (
      typeof link.url !== "string" ||
      !link.url.trim() ||
      typeof link.title !== "string" ||
      !safeUrlSet.has(link.url.trim()) ||
      excludedIndexSet.has(index)
    ) {
      continue;
    }

    await db.add("links", {
      id: nextId++,
      url: link.url.trim(),
      title: link.title,
      thumbnail_url:
        typeof link.thumbnail_url === "string"
          ? link.thumbnail_url
          : null,
      image_fit:
        link.image_fit === "contain"
          ? "contain"
          : "cover",
      genre: targetGenre,
      enabled: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    addedLinks++;
  }

  return {
    addedLinks,
    addedGenre,
  };
}

export type ClientBackupData = {
  version: 1 | 2;
  exportedAt?: string;
  links: Array<{
    id: number;
    url: string;
    title: string;
    thumbnail_url: string | null;
    image_fit: "cover" | "contain";
    media_id?: number | null;
    genre: string;
    enabled: number;
    created_at: string;
    updated_at: string;
  }>;
  genres: Array<{
    id: number;
    name: string;
    sort_order: number;
  }>;
  media?: Array<{
    id: number;
    data: string;
    filename: string;
    mime_type: string;
    created_at: string;
  }>;
};

export async function importClientBackup(data: ClientBackupData) {
  if (
    !data ||
    (data.version !== 1 && data.version !== 2) ||
    !Array.isArray(data.links) ||
    !Array.isArray(data.genres) ||
    (data.version === 2 && !Array.isArray(data.media))
  ) {
    throw new Error("対応していないバックアップファイルです。");
  }

  // IndexedDBトランザクション開始前に画像を変換する。
  const preparedMedia: Array<{
    oldId: number;
    blob: Blob;
    filename: string;
    mimeType: string;
    createdAt: string;
  }> = [];

  if (data.version === 2) {
    const seenIds = new Set<number>();

    for (const item of data.media ?? []) {
      if (
        !Number.isSafeInteger(item.id) ||
        seenIds.has(item.id) ||
        typeof item.data !== "string" ||
        !/^data:image\/(?:png|jpeg|gif|webp);base64,/.test(item.data) ||
        typeof item.filename !== "string"
      ) {
        throw new Error("バックアップ内の画像データが不正です。");
      }

      seenIds.add(item.id);

      const response = await fetch(item.data);
      const originalBlob = await response.blob();
      const buffer = await originalBlob.arrayBuffer();

      preparedMedia.push({
        oldId: item.id,
        blob: new Blob([buffer], {
          type: originalBlob.type,
        }),
        filename: item.filename,
        mimeType: originalBlob.type,
        createdAt:
          typeof item.created_at === "string"
            ? item.created_at
            : new Date().toISOString(),
      });
    }
  }

  const db = await getClientDb();

  const tx = db.transaction(
    ["links", "genres", "media"],
    "readwrite"
  );

  try {
    const linksStore = tx.objectStore("links");
    const genresStore = tx.objectStore("genres");
    const mediaStore = tx.objectStore("media");

    const existingLinks = await linksStore.getAll();
    const existingGenres = await genresStore.getAll();
    const existingMedia = await mediaStore.getAll();

    let nextId = Math.max(
      Date.now(),
      ...existingLinks.map((item) => item.id + 1),
      ...existingGenres.map((item) => item.id + 1),
      ...existingMedia.map((item) => item.id + 1)
    );

    const genreNames = new Set(
      existingGenres.map((item) => item.name)
    );

    const maxSortOrder = existingGenres.reduce(
      (max, item) => Math.max(max, item.sort_order),
      0
    );

    let addedGenres = 0;
    let addedLinks = 0;
    let addedMedia = 0;

    for (const genre of [...data.genres].sort(
      (a, b) => a.sort_order - b.sort_order
    )) {
      if (
        typeof genre.name !== "string" ||
        !genre.name.trim() ||
        genreNames.has(genre.name.trim())
      ) {
        continue;
      }

      await genresStore.add({
        id: nextId++,
        name: genre.name.trim(),
        sort_order: maxSortOrder + addedGenres + 1,
      });

      genreNames.add(genre.name.trim());
      addedGenres++;
    }

    if (!genreNames.has("New")) {
      await genresStore.add({
        id: nextId++,
        name: "New",
        sort_order: 0,
      });

      genreNames.add("New");
      addedGenres++;
    }

    // 画像の旧IDと新IDの対応表。
    const mediaIdMap = new Map<number, number>();

    for (const item of preparedMedia) {
      const newId = nextId++;

      await mediaStore.add({
        id: newId,
        blob: item.blob,
        filename: item.filename,
        mime_type: item.mimeType,
        created_at: item.createdAt,
      });

      mediaIdMap.set(item.oldId, newId);
      addedMedia++;
    }

    for (const link of data.links) {
if (
  typeof link.url !== "string" ||
  typeof link.title !== "string" ||
  (!link.url.trim() &&
    !(data.version === 2 && link.media_id != null))
) {
  continue;
}

      const genre =
        typeof link.genre === "string" &&
        genreNames.has(link.genre)
          ? link.genre
          : "New";

      let mediaId: number | null = null;

      if (data.version === 2 && link.media_id != null) {
        mediaId = mediaIdMap.get(link.media_id) ?? null;

        if (mediaId === null) {
          throw new Error(
            "カードに対応する画像がバックアップ内にありません。"
          );
        }
      }

      await linksStore.add({
        id: nextId++,
        url: link.url,
        title: link.title,
        thumbnail_url:
          typeof link.thumbnail_url === "string"
            ? link.thumbnail_url
            : null,
        image_fit:
          link.image_fit === "contain"
            ? "contain"
            : "cover",
        media_id: mediaId,
        genre,
        enabled: link.enabled === 0 ? 0 : 1,
        created_at:
          typeof link.created_at === "string"
            ? link.created_at
            : new Date().toISOString(),
        updated_at:
          typeof link.updated_at === "string"
            ? link.updated_at
            : new Date().toISOString(),
      });

      addedLinks++;
    }

    await tx.done;

    return {
      addedLinks,
      addedGenres,
      addedMedia,
    };
  } catch (error) {
    if (tx.objectStore("links").transaction) {
      try {
        tx.abort();
      } catch {
        // 既に終了したトランザクションは中断できない。
      }
    }

    throw error;
  }
}

export type ClientMediaInput = {
  blob: Blob;
  filename: string;
  mimeType: string;
};

export async function insertClientMedia(
  input: ClientMediaInput
) {
  const db = await getClientDb();

  const buffer = await input.blob.arrayBuffer();

  const safeBlob = new Blob([buffer], {
    type: input.mimeType || input.blob.type,
  });

  const id = Date.now();

  await db.add("media", {
    id,
    blob: safeBlob,
    filename: input.filename,
    mime_type: input.mimeType,
    created_at: new Date().toISOString(),
  });

  return id;
}

export async function getClientMedia(id: number) {
  const db = await getClientDb();
  return db.get("media", id);
}

export async function deleteClientMedia(id: number) {
  const db = await getClientDb();
  await db.delete("media", id);
}

export async function exportClientMediaBackup() {
  const db = await getClientDb();
  const records = await db.getAll("media");

  return Promise.all(
    records.map(async (record) => {
      const data = await new Promise<string>(
        (resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            if (typeof reader.result !== "string") {
              reject(new Error("画像の変換に失敗しました。"));
              return;
            }

            resolve(reader.result);
          };

          reader.onerror = () => {
            reject(new Error("画像の読み込みに失敗しました。"));
          };

          reader.readAsDataURL(record.blob);
        }
      );

      return {
        id: record.id,
        data,
        filename: record.filename,
        mime_type: record.mime_type,
        created_at: record.created_at,
      };
    })
  );
}