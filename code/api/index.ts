import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Entry point for the Vercel Function that serves the whole API.
 *
 * Vercel's `api/` directory runs on the Node.js runtime, which invokes handlers with Node's
 * `(IncomingMessage, ServerResponse)` signature — not the Web `Request`/`Response` pair that
 * `hono/vercel`'s `handle()` produces, which is why that adapter fails here. The Node runtime
 * (rather than Edge) is required because the Postgres client needs a raw TCP connection.
 *
 * The app and its adapter are imported dynamically inside a try/catch: a failure while loading
 * the module graph would otherwise surface only as an opaque FUNCTION_INVOCATION_FAILED with no
 * way to tell what broke. This reports the actual error as JSON instead.
 *
 * Routing is handled by an explicit rewrite in `vercel.json` (`/api/(.*)` -> `/api`), which
 * preserves the original request path for Hono to match against.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const [{ getRequestListener }, { default: app }] = await Promise.all([
      import("@hono/node-server"),
      import("../src/worker/index.js"),
    ]);

    return getRequestListener(app.fetch)(req, res);
  } catch (error) {
    const err = error as Error & { code?: string };
    console.error("Fallo al cargar la API:", err);

    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify(
        {
          bootError: err?.message ?? String(error),
          code: err?.code,
          stack: err?.stack?.split("\n").slice(0, 12),
        },
        null,
        2
      )
    );
  }
}
