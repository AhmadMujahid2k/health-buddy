import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "./schema.mjs";

export const DB_PATH = process.env.HEALTH_DB ?? path.join(process.cwd(), "data", "health.db");

const g = globalThis as unknown as { __healthDb?: Database.Database };

export function db(): Database.Database {
  if (!g.__healthDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const conn = new Database(DB_PATH);
    conn.pragma("journal_mode = WAL");
    conn.pragma("foreign_keys = ON");
    migrate(conn);
    g.__healthDb = conn;
  }
  return g.__healthDb;
}
