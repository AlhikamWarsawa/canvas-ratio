import { createAccessToken, redeemAuthorizationCode } from "@/lib/mcp-auth";
import { oauthCorsHeaders, oauthJson } from "@/lib/oauth-http";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) { return new Response(null, { status: 204, headers: oauthCorsHeaders(request) }); }

export async function POST(request: Request) {
  const params = new URLSearchParams(await request.text());
  if (params.get("grant_type") !== "authorization_code") return oauthJson(request, { error: "unsupported_grant_type" }, { status: 400 });
  const token = redeemAuthorizationCode(params.get("code") ?? "", params.get("code_verifier") ?? "", params.get("client_id") ?? "", params.get("redirect_uri") ?? "");
  if (!token) return oauthJson(request, { error: "invalid_grant" }, { status: 400 });
  return oauthJson(request, { access_token: createAccessToken(token), token_type: "Bearer", expires_in: 3600, scope: "mcp:read" }, { headers: { "cache-control": "no-store" } });
}
