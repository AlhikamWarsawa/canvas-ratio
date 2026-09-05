import { collectSnapshotByPrefix, loadMcpSnapshot, parseSnapshotValue } from "@/lib/mcp-snapshot";

export const runtime = "nodejs";

const tools = [
  { name: "read_canvas", description: "Read Canvas day records and Canvas projects.", key: "canvas" },
  { name: "read_deadline_zone", description: "Read Deadline Zone tasks, deadlines, projects, and manual progress.", key: "deadline" },
  { name: "read_study_lab", description: "Read Study Lab decks, flashcards, and review settings.", key: "study" },
  { name: "read_project_files", description: "Read Project Files and their completion blocks.", key: "project-files" },
  { name: "read_weekly_review", description: "Read saved Weekly Review entries.", key: "weekly" },
  { name: "read_monthly_review", description: "Read saved Monthly Review entries.", key: "monthly" },
] as const;

function authorized(request: Request): boolean {
  const expected = process.env.MCP_API_KEY;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { Allow: "POST, OPTIONS" } });
}

export async function POST(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

  let body: { id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonRpcError(null, -32700, "Invalid JSON");
  }

  const id = body.id ?? null;
  if (body.method === "initialize") {
    return Response.json({ jsonrpc: "2.0", id, result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "canvas-ratio", version: "1.0.0" } } });
  }
  if (body.method === "notifications/initialized") return new Response(null, { status: 202 });
  if (body.method === "ping") return Response.json({ jsonrpc: "2.0", id, result: {} });
  if (body.method === "tools/list") {
    return Response.json({ jsonrpc: "2.0", id, result: { tools: tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true } })) } });
  }
  if (body.method !== "tools/call") return jsonRpcError(id, -32601, `Unsupported method: ${body.method ?? "unknown"}`);

  const name = body.params?.name;
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) return jsonRpcError(id, -32602, "Unknown tool");
  const snapshot = await loadMcpSnapshot();
  const data = tool.key === "canvas"
    ? { settings: parseSnapshotValue(snapshot, "canvas-ratio:settings"), days: collectSnapshotByPrefix(snapshot, "canvas-ratio:v1:") }
    : tool.key === "deadline"
      ? parseSnapshotValue(snapshot, "canvas-ratio:deadline-zone:v1")
      : tool.key === "study"
        ? parseSnapshotValue(snapshot, "recall-lab:flashcards:v1")
        : tool.key === "project-files"
          ? parseSnapshotValue(snapshot, "canvas-ratio:project-files:v1")
          : tool.key === "weekly"
            ? collectSnapshotByPrefix(snapshot, "canvas-ratio:weekly-review:v1:")
            : collectSnapshotByPrefix(snapshot, "canvas-ratio:monthly-review:v1:");
  return Response.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify({ page: tool.key, data }) }], structuredContent: { page: tool.key, data } } });
}
