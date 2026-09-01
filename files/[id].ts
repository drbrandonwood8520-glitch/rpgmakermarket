// Cloudflare Pages Function -> served at /api/pages/:id
// GET  loads a saved page tree; PUT saves it. Storage is Workers KV.
// env.PAGES_KV comes from the binding in wrangler.toml / Pages settings.

export const onRequestGet = async ({ params, env }: any) => {
  const data = await env.PAGES_KV.get(`page:${params.id}`);
  return new Response(data ?? "null", {
    headers: { "content-type": "application/json" },
  });
};

export const onRequestPut = async ({ params, env, request }: any) => {
  const body = await request.text();
  await env.PAGES_KV.put(`page:${params.id}`, body);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
};
