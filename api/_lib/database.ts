import fs from "node:fs/promises";
import path from "node:path";

import {
  Pool,
  neonConfig,
  type PoolClient,
  type QueryResultRow,
} from "@neondatabase/serverless";
import ws from "ws";

export interface DatabaseSession {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;
}

interface DatabaseOptions {
  transaction?: boolean;
}

type LocalDatabase = import("@electric-sql/pglite").PGlite;

interface DatabaseGlobal {
  __idcibidciLocalDatabasePromise?: Promise<LocalDatabase>;
}

// Vercel dev bundles each function independently. A module-scoped singleton
// therefore opens the same PGlite directory once per endpoint, which can make
// concurrent admin requests contend with each other. Keep the development
// database on globalThis so every function bundle in the dev process shares a
// single connection. Production always takes the Neon branch above.
const databaseGlobal = globalThis as typeof globalThis & DatabaseGlobal;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL) || process.env.VERCEL !== "1";
}

export function databaseDriver(): "neon" | "pglite" | "unavailable" {
  if (process.env.DATABASE_URL) return "neon";
  if (process.env.VERCEL !== "1") return "pglite";
  return "unavailable";
}

export async function withDatabase<T>(
  callback: (database: DatabaseSession) => Promise<T>,
  options: DatabaseOptions = {},
): Promise<T> {
  if (process.env.DATABASE_URL) {
    return withNeon(callback, options.transaction === true);
  }

  if (process.env.VERCEL === "1") {
    throw new Error(
      "Admin database is not configured. Connect Neon and set DATABASE_URL.",
    );
  }

  if (process.env.ADMIN_PGLITE_SERIAL === "true") {
    return withSerialLocalDatabase(callback, options.transaction === true);
  }

  const local = await getLocalDatabase();
  if (options.transaction) {
    return local.transaction(async (transaction) =>
      callback({
        async query<Row extends Record<string, unknown>>(
          sql: string,
          params: unknown[] = [],
        ) {
          const result = await transaction.query<Row>(sql, params);
          return result.rows;
        },
      }),
    );
  }

  return callback({
    async query<Row extends Record<string, unknown>>(
      sql: string,
      params: unknown[] = [],
    ) {
      const result = await local.query<Row>(sql, params);
      return result.rows;
    },
  });
}

async function withNeon<T>(
  callback: (database: DatabaseSession) => Promise<T>,
  transaction: boolean,
): Promise<T> {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let client: PoolClient | undefined;

  try {
    client = await pool.connect();
    const session: DatabaseSession = {
      async query<Row extends Record<string, unknown>>(
        sql: string,
        params: unknown[] = [],
      ) {
        const result = await client!.query<Row & QueryResultRow>(sql, params);
        return result.rows;
      },
    };

    if (!transaction) return await callback(session);

    await client.query("BEGIN");
    try {
      const result = await callback(session);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    client?.release();
    await pool.end();
  }
}

async function getLocalDatabase() {
  if (!databaseGlobal.__idcibidciLocalDatabasePromise) {
    databaseGlobal.__idcibidciLocalDatabasePromise = (async () => {
      const { PGlite } = await import("@electric-sql/pglite");
      const dataDir = path.resolve(
        process.env.ADMIN_PGLITE_DATA_DIR ||
          path.join(process.cwd(), ".context/admin-data/pglite"),
      );
      await fs.mkdir(dataDir, { recursive: true });
      const database = new PGlite(`file://${dataDir}`);
      await database.waitReady;
      await runMigrations({
        async query<Row extends Record<string, unknown>>(
          sql: string,
          params: unknown[] = [],
        ) {
          const result = await database.query<Row>(sql, params);
          return result.rows;
        },
      });
      return database;
    })();
  }
  return databaseGlobal.__idcibidciLocalDatabasePromise;
}

async function withSerialLocalDatabase<T>(
  callback: (database: DatabaseSession) => Promise<T>,
  transaction: boolean,
): Promise<T> {
  const dataDir = localDataDirectory();
  await fs.mkdir(dataDir, { recursive: true });
  const release = await acquireLocalDatabaseLock(`${dataDir}.request-lock`);
  let database: LocalDatabase | undefined;

  try {
    const { PGlite } = await import("@electric-sql/pglite");
    database = new PGlite(`file://${dataDir}`);
    await database.waitReady;
    const session: DatabaseSession = {
      async query<Row extends Record<string, unknown>>(
        sql: string,
        params: unknown[] = [],
      ) {
        const result = await database!.query<Row>(sql, params);
        return result.rows;
      },
    };
    await runMigrations(session);

    if (!transaction) return await callback(session);
    return await database.transaction(async (databaseTransaction) =>
      callback({
        async query<Row extends Record<string, unknown>>(
          sql: string,
          params: unknown[] = [],
        ) {
          const result = await databaseTransaction.query<Row>(sql, params);
          return result.rows;
        },
      }),
    );
  } finally {
    await database?.close();
    await release();
  }
}

async function acquireLocalDatabaseLock(
  lockPath: string,
): Promise<() => Promise<void>> {
  const timeoutAt = Date.now() + 30_000;
  while (Date.now() < timeoutAt) {
    try {
      const handle = await fs.open(lockPath, "wx");
      await handle.writeFile(`${process.pid}:${Date.now()}`);
      return async () => {
        await handle.close();
        await fs.unlink(lockPath).catch(() => undefined);
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;
      const stats = await fs.stat(lockPath).catch(() => null);
      if (stats && Date.now() - stats.mtimeMs > 60_000) {
        await fs.unlink(lockPath).catch(() => undefined);
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, 35));
    }
  }
  throw new Error("Timed out waiting for the local admin database.");
}

function localDataDirectory() {
  return path.resolve(
    process.env.ADMIN_PGLITE_DATA_DIR ||
      path.join(process.cwd(), ".context/admin-data/pglite"),
  );
}

export async function runMigrations(database: DatabaseSession): Promise<void> {
  const migrationsDir = path.resolve(process.cwd(), "drizzle");
  const entries = (await fs.readdir(migrationsDir))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  await database.query(`
    CREATE TABLE IF NOT EXISTS "__idcibidci_migrations" (
      "name" text PRIMARY KEY,
      "applied_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  const appliedRows = await database.query<{ name: string }>(
    `SELECT "name" FROM "__idcibidci_migrations"`,
  );
  const applied = new Set(appliedRows.map((row) => row.name));

  for (const filename of entries) {
    if (applied.has(filename)) continue;
    const raw = await fs.readFile(path.join(migrationsDir, filename), "utf8");
    const statements = raw
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) await database.query(statement);
    await database.query(
      `INSERT INTO "__idcibidci_migrations" ("name") VALUES ($1)`,
      [filename],
    );
  }
}

export async function migrateConfiguredDatabase(): Promise<void> {
  await withDatabase((database) => runMigrations(database), {
    transaction: true,
  });
}

export async function closeLocalDatabase(): Promise<void> {
  if (!databaseGlobal.__idcibidciLocalDatabasePromise) return;
  const database = await databaseGlobal.__idcibidciLocalDatabasePromise;
  await database.close();
  databaseGlobal.__idcibidciLocalDatabasePromise = undefined;
}
