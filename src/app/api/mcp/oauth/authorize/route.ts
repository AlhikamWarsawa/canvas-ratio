import { createAuthorizationCode, verifyMcpLogin } from "@/lib/mcp-auth";

export const runtime = "nodejs";

function formPage(params: URLSearchParams, error = "") {
  const fields = ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state"]
    .map((key) => `<input type="hidden" name="${key}" value="${escapeHtml(params.get(key) ?? "")}">`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Connect Canvas Ratio</title></head><body style="font-family:system-ui;max-width:460px;margin:60px auto;padding:24px"><h1>Connect Canvas Ratio</h1><p>Enter your MCP key to authorize ChatGPT to read your Canvas Ratio snapshot.</p>${error ? `<p style="color:#b91c1c">${escapeHtml(error)}</p>` : ""}<form method="post">${fields}<label>MCP key<br><input name="mcp_key" type="password" required style="width:100%;padding:10px;margin:8px 0 16px"></label><button type="submit" style="padding:10px 16px">Authorize</button></form></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character));
}

function validRequest(params: URLSearchParams): boolean {
  return params.get("response_type") === "code" && !!params.get("client_id") && !!params.get("redirect_uri") && params.get("code_challenge_method") === "S256" && !!params.get("code_challenge");
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (!validRequest(params)) return new Response("Invalid OAuth authorization request", { status: 400 });
  return new Response(formPage(params), { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function POST(request: Request) {
  const params = new URLSearchParams(await request.text());
  if (!validRequest(params) || !verifyMcpLogin(params.get("mcp_key") ?? "")) return new Response(formPage(params, "Invalid authorization request or MCP key."), { status: 400, headers: { "content-type": "text/html; charset=utf-8" } });
  const code = createAuthorizationCode({ clientId: params.get("client_id")!, redirectUri: params.get("redirect_uri")!, challenge: params.get("code_challenge")!, exp: Date.now() + 300_000 });
  const redirect = new URL(params.get("redirect_uri")!);
  redirect.searchParams.set("code", code);
  if (params.get("state")) redirect.searchParams.set("state", params.get("state")!);
  return Response.redirect(redirect, 302);
}
