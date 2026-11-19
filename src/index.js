// During emergency maintenance, serve the original GoFurry page with 503 semantics.
// Content source: public/index.html (unchanged from gofurry-nav-site).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") {
      return new Response("maintenance\n", { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { allow: "GET, HEAD", "cache-control": "no-store" } });
    }
    const pageUrl = new URL("/", request.url);
    const page = await env.ASSETS.fetch(new Request(pageUrl, { method: "GET" }));
    if (!page.ok) return new Response("Temporarily unavailable", { status: 503, headers: { "retry-after": "3600", "cache-control": "no-store" } });
    return new Response(request.method === "HEAD" ? null : page.body, {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "retry-after": "3600",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  },
};
