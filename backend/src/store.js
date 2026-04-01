import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../data/db.json");
const IS_SERVERLESS = Boolean(process.env.VERCEL);

export const defaultDB = {
  queues: [],
  tokens: [],
  trafficLogs: []
};

function normalizeDB(db) {
  return {
    queues: Array.isArray(db?.queues) ? db.queues : [],
    tokens: Array.isArray(db?.tokens) ? db.tokens : [],
    trafficLogs: Array.isArray(db?.trafficLogs) ? db.trafficLogs : []
  };
}

function getMemoryDB() {
  if (!globalThis.__smartQueueMemoryDB) {
    globalThis.__smartQueueMemoryDB = structuredClone(defaultDB);
  }
  return globalThis.__smartQueueMemoryDB;
}

export function readDB() {
  if (IS_SERVERLESS) {
    return normalizeDB(getMemoryDB());
  }

  if (!fs.existsSync(DB_PATH)) {
    writeDB(defaultDB);
    return structuredClone(defaultDB);
  }

  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return normalizeDB(JSON.parse(raw));
}

export function writeDB(db) {
  const normalized = normalizeDB(db);

  if (IS_SERVERLESS) {
    globalThis.__smartQueueMemoryDB = normalized;
    return;
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(normalized, null, 2), "utf-8");
}

export function updateDB(mutator) {
  const db = readDB();
  const result = mutator(db);
  writeDB(db);
  return result;
}
