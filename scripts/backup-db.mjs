// Consistent snapshot of the live SQLite DB (safe while the app is running).
// Usage: node scripts/backup-db.mjs [out.db]
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const src = process.env.HEALTH_DB ?? path.resolve("data/health.db");
const out = process.argv[2] ?? path.resolve("data/health-backup.db");
if (!fs.existsSync(src)) process.exit(0);
await new Database(src, { readonly: true }).backup(out);
console.log(`Backed up ${src} -> ${out}`);
