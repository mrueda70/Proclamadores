import { getRequestListener } from "@hono/node-server";
import app from "../src/worker";

/**
 * Entry point for the Vercel Function that serves the whole API.
 *
 * Vercel's `api/` directory runs on the Node.js runtime, which invokes handlers with
 * Node's `(IncomingMessage, ServerResponse)` signature — not the Web `Request`/`Response`
 * pair that `hono/vercel`'s `handle()` produces. Using the Web adapter here makes every
 * invocation fail (FUNCTION_INVOCATION_FAILED), so we adapt Hono's fetch handler to the
 * Node signature instead. The Node runtime (rather than Edge) is required because the
 * Postgres client needs a raw TCP connection.
 *
 * Routing to this file is done by an explicit rewrite in `vercel.json` (`/api/(.*)` -> `/api`)
 * rather than by a filesystem catch-all, because the rewrite preserves the original request
 * path — which is what Hono matches its routes against.
 */
export default getRequestListener(app.fetch);
