import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Minimal diagnostic function with no imports of its own.
 *
 * If /api/ping answers but the main API doesn't, the platform setup is fine and the fault is
 * in the app's module graph. If /api/ping also fails, the problem is project-level (build or
 * runtime configuration), not the application code.
 *
 * Reached directly at /api/ping: filesystem matches take precedence over the vercel.json rewrite.
 */
export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ pong: true, node: process.version }));
}
