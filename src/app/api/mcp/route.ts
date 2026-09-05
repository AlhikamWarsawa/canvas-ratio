import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { isMcpBearerValid } from "@/lib/mcp-auth";
import { collectSnapshotByPrefix, loadMcpSnapshot, parseSnapshotValue, type LocalStorageSnapshot } from "@/lib/mcp-snapshot";

export const runtime = "nodejs";

const toolDefinitions = [
  { name: "read_canvas", description: "Read Canvas day records and Canvas projects.", key: "canvas" },
  { name: "read_deadline_zone", description: "Read Deadline Zone tasks, deadlines, projects, and manual progress.", key: "deadline" },
  { name: "read_study_lab", description: "Read Study Lab decks, flashcards, and review settings.", key: "study" },
  { name: "read_project_files", description: "Read Project Files and their completion blocks.", key: "project-files" },
  { name: "read_weekly_review", description: "Read saved Weekly Review entries.", key: "weekly" },
  { name: "read_monthly_review", description: "Read saved Monthly Review entries.", key: "monthly" },
] as const;

function pageData(snapshot: LocalStorageSnapshot, key: (typeof toolDefinitions)[number]["key"]): unknown {
  if (key === "canvas") return { settings: parseSnapshotValue(snapshot, "canvas-ratio:settings"), days: collectSnapshotByPrefix(snapshot, "canvas-ratio:v1:") };
  if (key === "deadline") return parseSnapshotValue(snapshot, "canvas-ratio:deadline-zone:v1");
  if (key === "study") return parseSnapshotValue(snapshot, "recall-lab:flashcards:v1");
  if (key === "project-files") return parseSnapshotValue(snapshot, "canvas-ratio:project-files:v1");
  if (key === "weekly") return collectSnapshotByPrefix(snapshot, "canvas-ratio:weekly-review:v1:");
  return collectSnapshotByPrefix(snapshot, "canvas-ratio:monthly-review:v1:");
}

function createServer(snapshot: LocalStorageSnapshot): McpServer {
  const server = new McpServer({ name: "canvas-ratio", version: "1.0.0" }, { instructions: "Canvas Ratio read-only data access for six app areas." });
  for (const tool of toolDefinitions) {
    server.registerTool(tool.name, { description: tool.description, annotations: { readOnlyHint: true } }, async () => ({
      content: [{ type: "text", text: JSON.stringify({ page: tool.key, data: pageData(snapshot, tool.key) }) }],
    }));
  }
  return server;
}

export async function OPTIONS() { return new Response(null, { status: 204, headers: { Allow: "GET, POST, DELETE, OPTIONS" } }); }

export async function GET(request: Request) {
  if (!isMcpBearerValid(request)) return new Response("Unauthorized", { status: 401 });
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: false });
  const server = createServer(await loadMcpSnapshot());
  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function POST(request: Request) {
  if (!isMcpBearerValid(request)) return new Response("Unauthorized", { status: 401, headers: { "www-authenticate": 'Bearer realm="canvas-ratio-mcp"' } });
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  const server = createServer(await loadMcpSnapshot());
  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function DELETE(request: Request) {
  if (!isMcpBearerValid(request)) return new Response("Unauthorized", { status: 401 });
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  const server = createServer(await loadMcpSnapshot());
  await server.connect(transport);
  return transport.handleRequest(request);
}
