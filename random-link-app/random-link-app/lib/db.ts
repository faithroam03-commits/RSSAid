import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { LinkRecord } from "./types";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "app.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  image_fit TEXT NOT NULL DEFAULT 'cover',
  genre TEXT NOT NULL DEFAULT 'New',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_links_genre_enabled
ON links(genre, enabled);
CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL
);

INSERT OR IGNORE INTO genres (name, sort_order)
VALUES ('New', 0);
`);

try {
  db.exec(`
    ALTER TABLE links
    ADD COLUMN image_fit TEXT NOT NULL DEFAULT 'cover'
  `);
} catch {
  // すでに image_fit 列がある場合は何もしない
}

export function listLinks(): LinkRecord[] {
  return db.prepare(
    "SELECT * FROM links ORDER BY datetime(created_at) DESC, id DESC"
  ).all() as LinkRecord[];
}

export function getLink(id: number): LinkRecord | undefined {
  return db.prepare("SELECT * FROM links WHERE id = ?").get(id) as LinkRecord | undefined;
}

db.exec(`
  INSERT OR IGNORE INTO genres (name, sort_order)
  SELECT
    genre,
    (
      SELECT COALESCE(MAX(sort_order), 0) + 1
      FROM genres
    )
  FROM links
  WHERE genre IS NOT NULL
    AND TRIM(genre) <> ''
    AND genre <> 'New'
  GROUP BY genre;
`);

export function getGenres(): string[] {
  const rows = db.prepare(`
    SELECT name
    FROM genres
    ORDER BY sort_order ASC, id ASC
  `).all() as { name: string }[];

  return rows.map((r) => r.name);
}

export function addGenre(name: string) {
  const genre = name.trim();

  if (!genre || genre === "New") return;

  const row = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM genres")
    .get() as { maxOrder: number };

  db.prepare(`
    INSERT OR IGNORE INTO genres (name, sort_order)
    VALUES (?, ?)
  `).run(genre, row.maxOrder + 1);
}

export function deleteGenre(name: string) {
  const genre = name.trim();

  if (!genre || genre === "New") return;

  db.prepare(`
    UPDATE links
    SET genre = 'New',
        updated_at = CURRENT_TIMESTAMP
    WHERE genre = ?
  `).run(genre);

  db.prepare(`
    DELETE FROM genres
    WHERE name = ?
  `).run(genre);
}

export function reorderGenres(names: string[]) {
  const update = db.prepare(`
    UPDATE genres
    SET sort_order = ?
    WHERE name = ?
  `);

  const transaction = db.transaction((items: string[]) => {
    items.forEach((name, index) => {
      update.run(index, name);
    });
  });

  transaction(names);
}

export function randomLink(genre?: string): LinkRecord | undefined {
  if (genre) {
    return db.prepare(
      "SELECT * FROM links WHERE enabled = 1 AND genre = ? ORDER BY RANDOM() LIMIT 1"
    ).get(genre) as LinkRecord | undefined;
  }
  return db.prepare(
    "SELECT * FROM links WHERE enabled = 1 ORDER BY RANDOM() LIMIT 1"
  ).get() as LinkRecord | undefined;
}
export function randomLinks(
  count: number,
  genre?: string
): LinkRecord[] {
  if (genre) {
    return db
      .prepare(
        `
        SELECT *
        FROM links
        WHERE enabled = 1
          AND genre = ?
        ORDER BY RANDOM()
        LIMIT ?
        `
      )
      .all(genre, count) as LinkRecord[];
  }

  return db
    .prepare(
      `
      SELECT *
      FROM links
      WHERE enabled = 1
      ORDER BY RANDOM()
      LIMIT ?
      `
    )
    .all(count) as LinkRecord[];
}
export function getLinkByUrl(url: string) {
  const row = db
    .prepare(
      `
      SELECT *
      FROM links
      WHERE url = ?
      LIMIT 1
      `
    )
    .get(url);

  return row;
}

export function insertLink(input: {
  url: string;
  title: string;
  thumbnailUrl?: string | null;
  imageFit?: "cover" | "contain";
  genre?: string;
}): number {
  const result = db
    .prepare(`
      INSERT INTO links (
        url,
        title,
        thumbnail_url,
        image_fit,
        genre
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(
      input.url,
      input.title,
      input.thumbnailUrl ?? null,
      input.imageFit ?? "cover",
      input.genre?.trim() || "New"
    );

  return Number(result.lastInsertRowid);
}

export function updateLink(input: {
  id: number;
  url: string;
  title: string;
  thumbnailUrl?: string | null;
  imageFit: "cover" | "contain";
  genre: string;
  enabled: boolean;
}) {
  db.prepare(`
    UPDATE links
    SET
      url = ?,
      title = ?,
      thumbnail_url = ?,
      image_fit = ?,
      genre = ?,
      enabled = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    input.url,
    input.title,
    input.thumbnailUrl ?? null,
    input.imageFit,
    input.genre.trim() || "New",
    input.enabled ? 1 : 0,
    input.id
  );
}

export function deleteLink(id: number) {
  db.prepare("DELETE FROM links WHERE id = ?").run(id);
}