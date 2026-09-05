import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

export type LocalStorageSnapshot = Record<string, string>;

const snapshotPath = path.join(process.cwd(), "docker-data", "mcp-snapshot.json");
let pool: Pool | null = null;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });
  return pool;
}

export async function loadMcpSnapshot(): Promise<LocalStorageSnapshot> {
  const database = getPool();
  if (database) {
    try {
      await database.query("CREATE TABLE IF NOT EXISTS canvas_ratio_mcp_snapshot (id INTEGER PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
      const result = await database.query<{ data: LocalStorageSnapshot }>("SELECT data FROM canvas_ratio_mcp_snapshot WHERE id = 1");
      return result.rows[0]?.data ?? {};
    } catch {
      return {};
    }
  }
  try {
    return JSON.parse(await readFile(snapshotPath, "utf8")) as LocalStorageSnapshot;
  } catch {
    return {};
  }
}

export async function saveMcpSnapshot(snapshot: LocalStorageSnapshot): Promise<void> {
  const database = getPool();
  if (database) {
    await database.query("CREATE TABLE IF NOT EXISTS canvas_ratio_mcp_snapshot (id INTEGER PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    await database.query("INSERT INTO canvas_ratio_mcp_snapshot (id, data, updated_at) VALUES (1, $1::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()", [JSON.stringify(snapshot)]);
    return;
  }
  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, JSON.stringify(snapshot), "utf8");
}

export function parseSnapshotValue(snapshot: LocalStorageSnapshot, key: string): unknown {
  const value = snapshot[key];
  if (value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function collectSnapshotByPrefix(snapshot: LocalStorageSnapshot, prefix: string): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(snapshot)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => {
        try {
          return [key, JSON.parse(value)];
        } catch {
          return [key, value];
        }
      }),
  );
}
