export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return Response.json({ resource: `${origin}/api/mcp`, authorization_servers: [origin], scopes_supported: ["mcp:read"], bearer_methods_supported: ["header"] }, { headers: { "cache-control": "public, max-age=300" } });
}
