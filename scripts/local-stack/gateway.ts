// Local stand-in for Supabase's API gateway, for scripts/local-stack/up.sh.
// Routes /rest/v1 -> PostgREST, /auth/v1 -> GoTrue, and /functions/v1/<name>
// -> the real Edge Function sources in supabase/functions, loaded in-process.
const realServe = Deno.serve.bind(Deno);
const handlers = new Map<string, (req: Request) => Response | Promise<Response>>();
let current = "";
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (handler: (req: Request) => Response | Promise<Response>) => {
  handlers.set(current, handler);
  return { finished: Promise.resolve() };
};
// deno-lint-ignore no-explicit-any
(globalThis as any).EdgeRuntime = { waitUntil: (p: Promise<unknown>) => p.catch(console.error) };
for (const name of ["check-availability", "create-booking", "get-booking", "send-booking-email"]) {
  current = name;
  await import(`/app/supabase/functions/${name}/index.ts`);
}

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" };

async function proxy(req: Request, target: string) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const headers = new Headers(req.headers);
  headers.delete("host");
  const res = await fetch(target, { method: req.method, headers, body: req.body });
  const out = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors)) out.set(k, v);
  return new Response(res.body, { status: res.status, headers: out });
}

realServe({ port: 54321 }, async (req) => {
  const url = new URL(req.url);
  if (url.pathname.startsWith("/functions/v1/")) {
    const h = handlers.get(url.pathname.split("/")[3]);
    return h ? await h(req) : new Response("no such function", { status: 404, headers: cors });
  }
  if (url.pathname.startsWith("/rest/v1/")) return proxy(req, "http://127.0.0.1:3001" + url.pathname.slice(8) + url.search);
  if (url.pathname.startsWith("/auth/v1/")) return proxy(req, "http://127.0.0.1:9999" + url.pathname.slice(8) + url.search);
  return new Response("not found", { status: 404, headers: cors });
});
