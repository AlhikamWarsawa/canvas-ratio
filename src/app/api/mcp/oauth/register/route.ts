export const runtime = "nodejs";

export async function POST() {
  return Response.json({ client_id: "canvas-ratio-chatgpt", client_name: "ChatGPT", token_endpoint_auth_method: "none" }, { status: 201 });
}
