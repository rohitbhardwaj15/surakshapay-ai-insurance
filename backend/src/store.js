import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DB_PATH    = path.resolve(__dirname, "../data/db.json");

// Detect Vercel serverless environment — no filesystem writes allowed
const IS_SERVERLESS = Boolean(process.env.VERCEL);

// ─── Default SurakshaPay Schema ───────────────────────────────────────────────
export const defaultDB = {
  riders:   [],
  policies: [],
  claims:   [],
  triggers: [
    { id: "t1", type: "rainfall",    label: "Heavy Rainfall", value: 10,  unit: "mm",   threshold: 35,  active: false },
    { id: "t2", type: "aqi",         label: "AQI Spike",      value: 120, unit: "AQI",  threshold: 350, active: false },
    { id: "t3", type: "temperature", label: "Heatwave",        value: 38,  unit: "°C",   threshold: 44,  active: false },
    { id: "t4", type: "curfew",      label: "Curfew Alert",   value: 0,   unit: "bool", threshold: 1,   active: false },
    { id: "t5", type: "flood",       label: "Flood Alert",    value: 0,   unit: "bool", threshold: 1,   active: false }
  ]
};

// ─── Normalize to ensure correct keys always exist ────────────────────────────
function normalizeDB(raw) {
  return {
    riders:   Array.isArray(raw?.riders)   ? raw.riders   : [],
    policies: Array.isArray(raw?.policies) ? raw.policies : [],
    claims:   Array.isArray(raw?.claims)   ? raw.claims   : [],
    triggers: Array.isArray(raw?.triggers) && raw.triggers.length > 0
      ? raw.triggers
      : defaultDB.triggers
  };
}

// ─── In-memory store for Vercel (stateless per cold start) ───────────────────
function getMemoryDB() {
  if (!globalThis.__surakshapayDB) {
    globalThis.__surakshapayDB = structuredClone(defaultDB);
  }
  return globalThis.__surakshapayDB;
}

// ─── Public API ───────────────────────────────────────────────────────────────
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
    globalThis.__surakshapayDB = normalized;
    return;
  }
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(normalized, null, 2), "utf-8");
}

export function updateDB(mutator) {
  const db     = readDB();
  const result = mutator(db);
  writeDB(db);
  return result;
}
