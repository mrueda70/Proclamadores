import { authMiddleware as baseAuthMiddleware } from "@getmocha/users-service/backend";
import type { MochaUser } from "@getmocha/users-service/shared";
import type { Context, Next } from "hono";

// Middleware that requires admin role
export const adminMiddleware = async (c: Context, next: Next) => {
  await baseAuthMiddleware(c, async () => {});

  const user = c.get("user") as MochaUser;
  
  const roleData = await c.env.DB
    .prepare("SELECT role FROM user_roles WHERE user_id = ?")
    .bind(user.id)
    .first();

  const role = roleData as { role: string } | null;

  if (role?.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  await next();
};
