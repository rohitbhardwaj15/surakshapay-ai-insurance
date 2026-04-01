import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../data/db.json");
const IS_SERVERLESS = Boolean(process.env.VERCEL);

export const defaultDB = {
  users: [],
  policies: [],
  claims: [],
  riskScores: [],
  triggers: []
};

function getMemoryDB() {
  if (!globalThis.__surakshaMemoryDB) {
    globalThis.__surakshaMemoryDB = structuredClone(defaultDB);
  }
  return globalThis.__surakshaMemoryDB;
}

export function readDB() {
  if (IS_SERVERLESS) {
    return getMemoryDB();
  }

  if (!fs.existsSync(DB_PATH)) {
    writeDB(defaultDB);
    return structuredClone(defaultDB);
  }

  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

export function writeDB(db) {
  if (IS_SERVERLESS) {
    globalThis.__surakshaMemoryDB = db;
    return;
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function updateDB(mutator) {
  const db = readDB();
  const result = mutator(db);
  writeDB(db);
  return result;
}
