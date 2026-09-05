import { registerOAuthClient } from "@/lib/mcp-auth";
import { oauthCorsHeaders, oauthJson } from "@/lib/oauth-http";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: oauthCorsHeaders(request) });
}

export async function POST(request: Request) {
  let metadata: { client_name?: unknown; client_uri?: unknown; redirect_uris?: unknown; grant_types?: unknown; response_types?: unknown; token_endpoint_auth_method?: unknown; scope?: unknown };
  try {
    metadata = (await request.json()) as typeof metadata;
  } catch {
    return oauthJson(request, { error: "invalid_client_metadata", error_description: "Request body must be JSON." }, { status: 400 });
  }

  const redirectUris = Array.isArray(metadata.redirect_uris) ? metadata.redirect_uris.filter((value): value is string => typeof value === "string") : [];
  if (!redirectUris.length || redirectUris.some((uri) => !isAllowedRedirectUri(uri))) {
    return oauthJson(request, { error: "invalid_redirect_uri", error_description: "redirect_uris must contain absolute HTTPS URLs (or localhost URLs)." }, { status: 400 });
  }
  if (metadata.token_endpoint_auth_method && metadata.token_endpoint_auth_method !== "none") {
    return oauthJson(request, { error: "invalid_client_metadata", error_description: "Only public PKCE clients with token_endpoint_auth_method=none are supported." }, { status: 400 });
  }
  if (metadata.grant_types && (!Array.isArray(metadata.grant_types) || !metadata.grant_types.includes("authorization_code"))) return oauthJson(request, { error: "invalid_client_metadata", error_description: "Only authorization_code is supported." }, { status: 400 });
  if (metadata.response_types && (!Array.isArray(metadata.response_types) || !metadata.response_types.includes("code"))) return oauthJson(request, { error: "invalid_client_metadata", error_description: "Only response_type=code is supported." }, { status: 400 });

  const clientName = typeof metadata.client_name === "string" ? metadata.client_name : undefined;
  const clientId = registerOAuthClient(clientName, redirectUris);
  return oauthJson(request, { client_id: clientId, client_name: clientName ?? "Canvas Ratio client", ...(typeof metadata.client_uri === "string" ? { client_uri: metadata.client_uri } : {}), redirect_uris: redirectUris, grant_types: ["authorization_code"], response_types: ["code"], token_endpoint_auth_method: "none", scope: "mcp:read", client_id_issued_at: Math.floor(Date.now() / 1_000), client_secret_expires_at: 0 }, { status: 201, headers: { "cache-control": "no-store" } });
}

function isAllowedRedirectUri(value: string): boolean {
  try {
    const uri = new URL(value);
    return uri.protocol === "https:" || (uri.protocol === "http:" && (uri.hostname === "localhost" || uri.hostname === "127.0.0.1"));
  } catch {
    return false;
  }
}
