import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

let db: BetterSQLite3Database<typeof schema> | null = null;

// Development user ID - consistent across sessions
export const DEV_USER_ID = "dev-user-00000000-0000-0000-0000-000000000000";
export const DEV_USER_EMAIL = "dev@localhost";

export function getLocalDb() {
  if (db) return db;

  // Create .local-data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), ".local-data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "dev.db");
  const sqlite = new Database(dbPath);

  // Enable foreign keys
  sqlite.pragma("foreign_keys = ON");

  db = drizzle(sqlite, { schema });

  // Initialize database with tables
  initializeDatabase(sqlite);

  return db;
}

function initializeDatabase(sqlite: Database.Database) {
  // Create tables if they don't exist
  sqlite.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT,
      avatar_url TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      valyu_sub TEXT,
      valyu_user_type TEXT,
      valyu_organisation_id TEXT,
      valyu_organisation_name TEXT,
      subscription_tier TEXT DEFAULT 'valyu',
      subscription_status TEXT DEFAULT 'active'
    );

    -- Featured markets table
    CREATE TABLE IF NOT EXISTS featured_markets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL,
      question TEXT NOT NULL,
      category TEXT,
      polymarket_url TEXT NOT NULL,
      market_url TEXT,
      platform TEXT DEFAULT 'polymarket',
      volume INTEGER NOT NULL DEFAULT 0,
      end_date INTEGER NOT NULL,
      current_odds TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_valyu_sub ON users(valyu_sub);
    CREATE INDEX IF NOT EXISTS idx_featured_markets_is_active ON featured_markets(is_active);
    CREATE INDEX IF NOT EXISTS idx_featured_markets_sort_order ON featured_markets(sort_order);
    CREATE INDEX IF NOT EXISTS idx_featured_markets_platform ON featured_markets(platform);
    CREATE INDEX IF NOT EXISTS idx_featured_markets_slug ON featured_markets(slug);
  `);

  // Insert dev user if it doesn't exist
  const existingUser = sqlite
    .prepare("SELECT id FROM users WHERE id = ?")
    .get(DEV_USER_ID);

  if (!existingUser) {
    sqlite
      .prepare(`INSERT INTO users (id, email, full_name, subscription_tier) VALUES (?, ?, ?, ?)`)
      .run(DEV_USER_ID, DEV_USER_EMAIL, "Development User", "unlimited");
  }
}

// Close database connection (for cleanup)
export function closeLocalDb() {
  if (db) {
    // @ts-expect-error - accessing internal sqlite instance
    db.$client?.close();
    db = null;
  }
}
