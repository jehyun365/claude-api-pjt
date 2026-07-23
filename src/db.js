import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'app.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS saved_recipes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    used_ingredients TEXT NOT NULL,
    missing_ingredients TEXT NOT NULL,
    steps TEXT NOT NULL,
    estimated_time_minutes INTEGER,
    saved_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON saved_recipes(user_id);
`);

export function createUser(id, nickname) {
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO users (id, nickname, created_at) VALUES (?, ?, ?)').run(id, nickname, createdAt);
  return { id, nickname, createdAt };
}

export function getUser(id) {
  const row = db.prepare('SELECT id, nickname, created_at AS createdAt FROM users WHERE id = ?').get(id);
  return row ?? null;
}

export function saveRecipe(id, userId, recipe) {
  const savedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO saved_recipes
      (id, user_id, name, used_ingredients, missing_ingredients, steps, estimated_time_minutes, saved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    recipe.name,
    JSON.stringify(recipe.usedIngredients ?? []),
    JSON.stringify(recipe.missingIngredients ?? []),
    JSON.stringify(recipe.steps ?? []),
    recipe.estimatedTimeMinutes ?? null,
    savedAt
  );
  return { id, savedAt };
}

function mapRecipeRow(row) {
  return {
    id: row.id,
    name: row.name,
    usedIngredients: JSON.parse(row.used_ingredients),
    missingIngredients: JSON.parse(row.missing_ingredients),
    steps: JSON.parse(row.steps),
    estimatedTimeMinutes: row.estimated_time_minutes,
    savedAt: row.saved_at,
  };
}

export function listRecipes(userId) {
  const rows = db
    .prepare('SELECT * FROM saved_recipes WHERE user_id = ? ORDER BY saved_at DESC')
    .all(userId);
  return rows.map(mapRecipeRow);
}

export function getRecipe(id) {
  const row = db.prepare('SELECT * FROM saved_recipes WHERE id = ?').get(id);
  return row ? mapRecipeRow({ ...row, user_id: row.user_id }) : null;
}

export function getRecipeOwner(id) {
  const row = db.prepare('SELECT user_id AS userId FROM saved_recipes WHERE id = ?').get(id);
  return row?.userId ?? null;
}

export function deleteRecipe(id) {
  db.prepare('DELETE FROM saved_recipes WHERE id = ?').run(id);
}
