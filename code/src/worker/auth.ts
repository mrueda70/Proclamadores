import { Hono } from "hono";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
  getCurrentUser,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import type { MochaUser } from "@getmocha/users-service/shared";

const app = new Hono<{ Bindings: Env }>();

// Get OAuth redirect URL
app.get("/api/oauth/google/redirect_url", async (c) => {
  const redirectUrl = await getOAuthRedirectUrl("google", {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

// Exchange code for session token
app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  // Create user role if doesn't exist (defaults to 'user')
  const user = await getCurrentUser(sessionToken, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  if (user) {
    const existingRole = await c.env.DB
      .prepare("SELECT * FROM user_roles WHERE user_id = ?")
      .bind(user.id)
      .first();

    if (!existingRole) {
      await c.env.DB
        .prepare("INSERT INTO user_roles (user_id, role) VALUES (?, ?)")
        .bind(user.id, "user")
        .run();
    }
  }

  return c.json({ success: true }, 200);
});

// Get current user with role
app.get("/api/users/me", authMiddleware, async (c) => {
  const user = c.get("user") as MochaUser;
  
  const roleData = await c.env.DB
    .prepare("SELECT role FROM user_roles WHERE user_id = ?")
    .bind(user.id)
    .first<{ role: string }>();

  return c.json({
    ...user,
    role: roleData?.role || "user",
  });
});

// Logout
app.get("/api/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === "string") {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Admin-only endpoint to update user role
app.put("/api/users/:userId/role", authMiddleware, async (c) => {
  const currentUser = c.get("user") as MochaUser;
  const targetUserId = c.req.param("userId");
  const { role } = await c.req.json();

  // Check if current user is admin
  const currentUserRole = await c.env.DB
    .prepare("SELECT role FROM user_roles WHERE user_id = ?")
    .bind(currentUser.id)
    .first<{ role: string }>();

  if (currentUserRole?.role !== "admin") {
    return c.json({ error: "Unauthorized" }, 403);
  }

  if (!["admin", "user"].includes(role)) {
    return c.json({ error: "Invalid role" }, 400);
  }

  const result = await c.env.DB
    .prepare("UPDATE user_roles SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? RETURNING *")
    .bind(role, targetUserId)
    .first();

  if (!result) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(result);
});

export default app;
