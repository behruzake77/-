import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { MIGRATIONS } from "./migrations.js";
import * as schema from "./schema.js";

export type MirDatabase = PgliteDatabase<typeof schema> | NodePgDatabase<typeof schema>;

export interface DatabaseHandle {
  mode: "postgres" | "pglite";
  db: MirDatabase;
  close: () => Promise<void>;
}

function extractRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Record<string, unknown>[] }).rows ?? [];
  }
  return [];
}

export async function executeRows<T = Record<string, unknown>>(
  db: MirDatabase,
  query: ReturnType<typeof sql>,
): Promise<T[]> {
  const result = await (db as unknown as { execute: (q: unknown) => Promise<unknown> }).execute(
    query,
  );
  return extractRows(result) as T[];
}

export async function runMigrations(db: MirDatabase): Promise<void> {
  for (const statement of MIGRATIONS) {
    await (db as unknown as { execute: (q: unknown) => Promise<unknown> }).execute(
      sql.raw(statement),
    );
  }
}

/**
 * PostgreSQL when DATABASE_URL is reachable; otherwise embedded Postgres
 * (PGlite) in DATA_DIR. The same Drizzle schema and SQL run in both modes.
 */
export async function createDatabase(options: {
  databaseUrl?: string;
  pgliteDir?: string;
  log?: (message: string) => void;
}): Promise<DatabaseHandle> {
  const log = options.log ?? (() => undefined);
  if (options.databaseUrl) {
    try {
      const pool = new Pool({
        connectionString: options.databaseUrl,
        max: 5,
        connectionTimeoutMillis: 4000,
      });
      await pool.query("select 1");
      const db = drizzlePg(pool, { schema });
      await runMigrations(db);
      log("PostgreSQL connected");
      return { mode: "postgres", db, close: () => pool.end() };
    } catch (error) {
      log(`PostgreSQL unavailable (${(error as Error).message}); falling back to embedded PGlite`);
    }
  }
  if (options.pgliteDir && options.pgliteDir !== "memory://") {
    fs.mkdirSync(path.dirname(options.pgliteDir), { recursive: true });
  }
  const client = await PGlite.create(options.pgliteDir ?? "memory://");
  const db = drizzlePglite(client, { schema });
  await runMigrations(db);
  log(`Embedded PGlite ready at ${options.pgliteDir ?? "memory://"}`);
  return {
    mode: "pglite",
    db,
    close: async () => {
      await client.close();
    },
  };
}
