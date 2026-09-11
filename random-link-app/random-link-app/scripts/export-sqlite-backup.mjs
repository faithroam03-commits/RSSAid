import Database from "better-sqlite3";
import fs from "node:fs";

const db = new Database("data/app.db", {
  readonly: true,
});

const links = db
  .prepare(`
    SELECT
      id,
      url,
      title,
      thumbnail_url,
      image_fit,
      genre,
      enabled,
      created_at,
      updated_at
    FROM links
    ORDER BY id
  `)
  .all();

const genres = db
  .prepare(`
    SELECT
      id,
      name,
      sort_order
    FROM genres
    ORDER BY sort_order, id
  `)
  .all();

const backup = {
  version: 1,
  exportedAt: new Date().toISOString(),
  links,
  genres,
};

const outputPath = "data/sqlite-migration-backup.json";

fs.writeFileSync(
  outputPath,
  JSON.stringify(backup, null, 2),
  "utf8"
);

console.log(`Exported ${links.length} links`);
console.log(`Exported ${genres.length} genres`);
console.log(`Saved to ${outputPath}`);

db.close();
