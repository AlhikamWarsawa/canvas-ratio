import { createHash, createHmac, timingSafeEqual } from "node:crypto";

type OAuthCodePayload = { type: "code"; clientId: string; redirectUri: string; challenge: string; exp: number };
type AccessTokenPayload = { type: "access"; exp: number };

function secret(): string {
  const value = process.env.MCP_API_KEY;
  if (!value) throw new Error("MCP_API_KEY is not configured");
  return value;
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

function issue(payload: OAuthCodePayload | AccessTokenPayload): string {
  const body = encode(payload);
  return `${body}.${sign(body)}`;
}

function read<T extends { type: string; exp: number }>(token: string, expectedType: T["type"]): T | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
    return payload.type === expectedType && payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function isMcpBearerValid(request: Request): boolean {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return false;
  if (process.env.MCP_API_KEY && bearer === process.env.MCP_API_KEY) return true;
  return !!read<AccessTokenPayload>(bearer, "access");
}

export function verifyMcpLogin(value: string): boolean {
  return !!process.env.MCP_API_KEY && value === process.env.MCP_API_KEY;
}

export function createAuthorizationCode(payload: Omit<OAuthCodePayload, "type">): string {
  return issue({ type: "code", ...payload });
}

export function redeemAuthorizationCode(code: string, verifier: string): AccessTokenPayload | null {
  const payload = read<OAuthCodePayload>(code, "code");
  if (!payload) return null;
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  if (challenge !== payload.challenge) return null;
  return { type: "access", exp: Date.now() + 3_600_000 };
}

export function createAccessToken(payload: AccessTokenPayload): string {
  return issue(payload);
}
