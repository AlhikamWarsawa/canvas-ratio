import { saveMcpSnapshot, type LocalStorageSnapshot } from "@/lib/mcp-snapshot";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { snapshot?: unknown };
    if (!body.snapshot || typeof body.snapshot !== "object" || Array.isArray(body.snapshot)) {
      return Response.json({ error: "snapshot must be an object" }, { status: 400 });
    }

    const snapshot = Object.fromEntries(
      Object.entries(body.snapshot).filter(
        ([key, value]) => typeof key === "string" && typeof value === "string" && (key.startsWith("canvas-ratio:") || key.startsWith("recall-lab:")),
      ),
    ) as LocalStorageSnapshot;
    await saveMcpSnapshot(snapshot);
    return Response.json({ ok: true, keys: Object.keys(snapshot).length });
  } catch {
    return Response.json({ error: "Could not save snapshot" }, { status: 500 });
  }
}
