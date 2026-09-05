import { createAccessToken, redeemAuthorizationCode } from "@/lib/mcp-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const params = new URLSearchParams(await request.text());
  if (params.get("grant_type") !== "authorization_code") return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
  const token = redeemAuthorizationCode(params.get("code") ?? "", params.get("code_verifier") ?? "");
  if (!token) return Response.json({ error: "invalid_grant" }, { status: 400 });
  return Response.json({ access_token: createAccessToken(token), token_type: "Bearer", expires_in: 3600, scope: "mcp:read" }, { headers: { "cache-control": "no-store" } });
}
