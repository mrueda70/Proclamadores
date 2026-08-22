import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Resend } from "resend";

const app = new Hono<{ Bindings: Env }>();

// Helper function to generate a random session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Helper function to get session from request (supports both header and cookie)
function getSessionToken(c: any): string | null {
  // Try to get from Authorization header first
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Clean up expired sessions periodically
async function cleanupSessions(db: any) {
  const now = Date.now();
  await db
    .prepare("DELETE FROM auth_sessions WHERE expires_at < ?")
    .bind(now)
    .run();
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

// Create session in database
async function createSession(db: any, token: string, role: string, expiresAt: number) {
  await db
    .prepare("INSERT INTO auth_sessions (token, role, expires_at) VALUES (?, ?, ?)")
    .bind(token, role, expiresAt)
    .run();
}

// Delete session from database
async function deleteSession(db: any, token: string) {
  await db
    .prepare("DELETE FROM auth_sessions WHERE token = ?")
    .bind(token)
    .run();
}

// Login as user (read-only)
app.post("/api/auth/user-login", async (c) => {
  const db = c.env.DB;
  const token = generateSessionToken();
  const expiresAt = Date.now() + (60 * 24 * 60 * 60 * 1000); // 60 days
  
  await createSession(db, token, "user", expiresAt);
  await cleanupSessions(db);
  
  return c.json({ success: true, role: "user", token });
});

// Verify PIN and login as admin
const pinSchema = z.object({
  pin: z.string().min(1).max(4),
});

app.post("/api/auth/admin-login", zValidator("json", pinSchema), async (c) => {
  const { pin } = c.req.valid("json");
  const db = c.env.DB;
  
  const adminPin = await db
    .prepare("SELECT pin FROM admin_pin ORDER BY id DESC LIMIT 1")
    .first();
  
  if (!adminPin || adminPin.pin !== pin) {
    // Send email with correct PIN
    if (c.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(c.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Parroquia Sistema <onboarding@resend.dev>",
          to: "lmrueda70@gmail.com",
          subject: "Intento de acceso fallido - PIN correcto",
          html: `
            <h2>Intento de acceso fallido al sistema de administración</h2>
            <p>Se ha intentado acceder al sistema con un PIN incorrecto.</p>
            <p><strong>El PIN correcto actual es: ${adminPin?.pin || '0000'}</strong></p>
            <p>Fecha y hora: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
          `,
        });
      } catch (error) {
        console.error("Error sending email:", error);
      }
    }
    
    return c.json({ error: "PIN incorrecto" }, 401);
  }
  
  const token = generateSessionToken();
  const expiresAt = Date.now() + (60 * 24 * 60 * 60 * 1000); // 60 days
  
  await createSession(db, token, "admin", expiresAt);
  await cleanupSessions(db);
  
  return c.json({ success: true, role: "admin", token });
});

// Get current session
app.get("/api/auth/session", async (c) => {
  const db = c.env.DB;
  const token = getSessionToken(c);
  
  if (!token) {
    return c.json({ authenticated: false, role: null });
  }
  
  const session = await getSession(db, token);
  
  if (!session) {
    return c.json({ authenticated: false, role: null });
  }
  
  return c.json({ 
    authenticated: true, 
    role: session.role 
  });
});

// Logout
app.post("/api/auth/logout", async (c) => {
  const db = c.env.DB;
  const token = getSessionToken(c);
  
  if (token) {
    await deleteSession(db, token);
  }
  
  return c.json({ success: true });
});

// Change admin PIN (admin only)
const changePinSchema = z.object({
  newPin: z.string().min(1).max(4),
});

app.post("/api/auth/change-pin", zValidator("json", changePinSchema), async (c) => {
  const db = c.env.DB;
  const token = getSessionToken(c);
  
  if (!token) {
    return c.json({ error: "No autorizado" }, 401);
  }
  
  const session = await getSession(db, token);
  
  if (!session) {
    return c.json({ error: "Sesión expirada" }, 401);
  }
  
  if (session.role !== "admin") {
    return c.json({ error: "Solo administradores pueden cambiar el PIN" }, 403);
  }
  
  const { newPin } = c.req.valid("json");
  
  await db
    .prepare("UPDATE admin_pin SET pin = ?, updated_at = CURRENT_TIMESTAMP")
    .bind(newPin)
    .run();
  
  return c.json({ success: true });
});

// Get current admin PIN (admin only)
app.get("/api/auth/current-pin", async (c) => {
  const db = c.env.DB;
  const token = getSessionToken(c);
  
  console.log("Getting current PIN - token:", token ? "present" : "missing");
  
  if (!token) {
    console.log("No token found");
    return c.json({ error: "No autorizado - no hay sesión activa" }, 401);
  }
  
  const session = await getSession(db, token);
  
  if (!session) {
    console.log("Session not found or expired");
    return c.json({ error: "Sesión expirada" }, 401);
  }
  
  console.log("Session data:", session);
  
  if (session.role !== "admin") {
    console.log("User is not admin, role:", session.role);
    return c.json({ error: "Solo administradores pueden ver el PIN" }, 403);
  }
  
  const adminPinData = await db
    .prepare("SELECT pin, security_question FROM admin_pin ORDER BY id DESC LIMIT 1")
    .first();
  
  console.log("Returning PIN data");
  return c.json({ 
    pin: adminPinData?.pin || '0000',
    security_question: adminPinData?.security_question || null
  });
});

// Update security question (admin only)
const securityQuestionSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

app.post("/api/auth/update-security-question", zValidator("json", securityQuestionSchema), async (c) => {
  const db = c.env.DB;
  const token = getSessionToken(c);
  
  if (!token) {
    return c.json({ error: "No autorizado" }, 401);
  }
  
  const session = await getSession(db, token);
  
  if (!session) {
    return c.json({ error: "Sesión expirada" }, 401);
  }
  
  if (session.role !== "admin") {
    return c.json({ error: "Solo administradores pueden actualizar la pregunta de seguridad" }, 403);
  }
  
  const { question, answer } = c.req.valid("json");
  
  // Store answer in lowercase for case-insensitive comparison
  const normalizedAnswer = answer.toLowerCase().trim();
  
  await db
    .prepare("UPDATE admin_pin SET security_question = ?, security_answer = ?, updated_at = CURRENT_TIMESTAMP")
    .bind(question, normalizedAnswer)
    .run();
  
  return c.json({ success: true });
});

// Get security question (public - no authentication required)
app.get("/api/auth/security-question", async (c) => {
  const db = c.env.DB;
  const adminPin = await db
    .prepare("SELECT security_question FROM admin_pin ORDER BY id DESC LIMIT 1")
    .first();
  
  if (!adminPin?.security_question) {
    return c.json({ error: "No hay pregunta de seguridad configurada" }, 404);
  }
  
  return c.json({ question: adminPin.security_question });
});

// Verify security answer and return PIN (public - no authentication required)
const verifyAnswerSchema = z.object({
  answer: z.string().min(1),
});

app.post("/api/auth/verify-security-answer", zValidator("json", verifyAnswerSchema), async (c) => {
  const { answer } = c.req.valid("json");
  const db = c.env.DB;
  
  const adminPin = await db
    .prepare("SELECT pin, security_answer FROM admin_pin ORDER BY id DESC LIMIT 1")
    .first();
  
  if (!adminPin?.security_answer) {
    return c.json({ error: "No hay pregunta de seguridad configurada" }, 404);
  }
  
  // Compare in lowercase and trimmed
  const normalizedAnswer = answer.toLowerCase().trim();
  
  if (normalizedAnswer !== adminPin.security_answer) {
    return c.json({ error: "Respuesta incorrecta" }, 401);
  }
  
  return c.json({ pin: adminPin.pin });
});

export default app;
