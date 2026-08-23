import type { Context, Next } from "hono";
import { db } from "./db.js";

// Get session token from Authorization header
function getSessionToken(c: Context): string | null {
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Get session from database
async function getSession(db: any, token: string): Promise<{ role: string; expiresAt: number } | null> {
  const session = await db
    .prepare("SELECT role, expires_at FROM auth_sessions WHERE token = ? AND expires_at > ?")
    .bind(token, Date.now())
    .first();
  
  if (!session) {
    return null;
  }
  
  return { role: session.role, expiresAt: session.expires_at };
}

// Middleware that requires admin role
export const requireAdmin = async (c: Context, next: Next) => {
  const token = getSessionToken(c);
  
  if (!token) {
    return c.json({ error: "No autorizado" }, 401);
  }
  
  const session = await getSession(db, token);
  
  if (!session) {
    return c.json({ error: "Sesión expirada" }, 401);
  }
  
  if (session.role !== "admin") {
    return c.json({ error: "Se requiere acceso de administrador" }, 403);
  }
  
  await next();
};