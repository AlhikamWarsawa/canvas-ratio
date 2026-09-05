import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type LocalStorageSnapshot = Record<string, string>;

const snapshotPath = path.join(process.cwd(), "docker-data", "mcp-snapshot.json");

export async function loadMcpSnapshot(): Promise<LocalStorageSnapshot> {
  try {
    return JSON.parse(await readFile(snapshotPath, "utf8")) as LocalStorageSnapshot;
  } catch {
    return {};
  }
}

export async function saveMcpSnapshot(snapshot: LocalStorageSnapshot): Promise<void> {
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
