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
  genre TEXT NOT NULL DEFAULT '新規登録',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_links_genre_enabled
ON links(genre, enabled);
`);

export function listLinks(): LinkRecord[] {
  return db.prepare(
    "SELECT * FROM links ORDER BY datetime(created_at) DESC, id DESC"
  ).all() as LinkRecord[];
}

export function getLink(id: number): LinkRecord | undefined {
  return db.prepare("SELECT * FROM links WHERE id = ?").get(id) as LinkRecord | undefined;
}

export function getGenres(): string[] {
  const rows = db.prepare(
    "SELECT DISTINCT genre FROM links WHERE enabled = 1 ORDER BY genre COLLATE NOCASE"
  ).all() as { genre: string }[];
  return rows.map((r) => r.genre);
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

export function insertLink(input: {
  url: string;
  title: string;
  thumbnailUrl?: string | null;
}): number {
  const result = db.prepare(`
    INSERT INTO links (url, title, thumbnail_url, genre)
    VALUES (?, ?, ?, '新規登録')
  `).run(input.url, input.title, input.thumbnailUrl ?? null);
  return Number(result.lastInsertRowid);
}

export function updateLink(input: {
  id: number;
  url: string;
  title: string;
  thumbnailUrl?: string | null;
  genre: string;
  enabled: boolean;
}) {
  db.prepare(`
    UPDATE links
    SET url = ?, title = ?, thumbnail_url = ?, genre = ?, enabled = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    input.url,
    input.title,
    input.thumbnailUrl || null,
    input.genre.trim() || "新規登録",
    input.enabled ? 1 : 0,
    input.id
  );
}

export function deleteLink(id: number) {
  db.prepare("DELETE FROM links WHERE id = ?").run(id);
}
