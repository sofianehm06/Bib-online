// Minimal JSON file datastore — zero external dependencies.
// Loads the whole database into memory on startup and persists on every save().
// Suitable for a single-process demo application.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_FILE = join(DATA_DIR, 'db.json');

const EMPTY = { users: [], books: [], exchanges: [] };

let data = structuredClone(EMPTY);

function load() {
  if (existsSync(DB_FILE)) {
    try {
      const parsed = JSON.parse(readFileSync(DB_FILE, 'utf-8'));
      data = { ...structuredClone(EMPTY), ...parsed };
      for (const key of Object.keys(EMPTY)) {
        if (!Array.isArray(data[key])) data[key] = [];
      }
    } catch {
      data = structuredClone(EMPTY);
    }
  } else {
    data = structuredClone(EMPTY);
    save();
  }
}

function save() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

load();

export const db = {
  get data() {
    return data;
  },
  save,
  reset() {
    data = structuredClone(EMPTY);
    save();
  },
};
