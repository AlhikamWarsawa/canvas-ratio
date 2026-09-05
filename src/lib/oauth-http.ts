export function oauthCorsHeaders(request: Request): HeadersInit {
  return {
    "access-control-allow-origin": request.headers.get("origin") ?? "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

export function oauthJson(request: Request, body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, { ...init, headers: { ...oauthCorsHeaders(request), ...(init.headers ?? {}) } });
}
