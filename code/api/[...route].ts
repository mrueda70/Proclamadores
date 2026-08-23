import { handle } from "hono/vercel";
import app from "../src/worker";

// Runs as a Node.js Vercel Function (not Edge) because the Postgres client
// needs a raw TCP connection, which the Edge runtime doesn't support.
export default handle(app);
