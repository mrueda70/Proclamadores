import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import simpleAuthRoutes from "./simple-auth";
import { requireAdmin } from "./simple-middleware";
import { db, pingDatabase } from "./db";
import { fetchReadingsFromCiudadRedonda } from "./services/readings";
import { generateLectioDivina, generateCantosSugeridos } from "./services/ai-content";

const app = new Hono();

app.use("/*", cors());

// Returns JSON on unhandled errors instead of an opaque platform 500, so a
// misconfigured environment is diagnosable from the browser's network tab.
app.onError((err, c) => {
  console.error("Unhandled API error:", err);
  return c.json(
    { error: "Error interno del servidor", message: err.message },
    500
  );
});

// Diagnostic endpoint: confirms the function is reachable, the environment
// variables are present, and the database answers.
app.get("/api/health", async (c) => {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
  };

  try {
    await pingDatabase();
    return c.json({ ok: true, env, database: "conectada" });
  } catch (error) {
    return c.json(
      {
        ok: false,
        env,
        database: "error",
        message: error instanceof Error ? error.message : "Error desconocido",
      },
      500
    );
  }
});

// Simple auth routes
app.route("/", simpleAuthRoutes);

// Schemas
const readerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().optional(),
  birth_date: z.string().optional(),
});

const massSchema = z.object({
  mass_date: z.string(),
  mass_time: z.string(),
  mass_type: z.string().nullish(),
  first_reading: z.string().nullish(),
  psalm: z.string().nullish(),
  second_reading: z.string().nullish(),
  gospel: z.string().nullish(),
  has_second_reading: z.number().optional(),
  has_commentator: z.number().optional(),
  has_notes: z.number().optional(),
  notes: z.string().nullish(),
  first_reader_id: z.number().nullish(),
  second_reader_id: z.number().nullish(),
  psalm_reader_id: z.number().nullish(),
  commentator_reader_id: z.number().nullish(),
  first_reader_custom: z.string().nullish(),
  second_reader_custom: z.string().nullish(),
  psalm_reader_custom: z.string().nullish(),
  commentator_reader_custom: z.string().nullish(),
});

const assignmentSchema = z.object({
  first_reader_id: z.number().nullable().optional(),
  second_reader_id: z.number().nullable().optional(),
  psalm_reader_id: z.number().nullable().optional(),
  commentator_reader_id: z.number().nullable().optional(),
  first_reader_custom: z.string().nullable().optional(),
  second_reader_custom: z.string().nullable().optional(),
  psalm_reader_custom: z.string().nullable().optional(),
  commentator_reader_custom: z.string().nullable().optional(),
});

const readerAvailabilitySchema = z.object({
  availability: z.array(z.object({
    day_of_week: z.number().min(0).max(6),
    mass_time: z.string(),
  })),
});

// Reader endpoints
// GET is public so user view can see reader names
// POST, PUT, DELETE require admin
app.get("/api/readers", async (c) => {
  const readers = await db.prepare("SELECT * FROM readers ORDER BY name").all();
  return c.json(readers.results);
});

app.post("/api/readers", requireAdmin, zValidator("json", readerSchema), async (c) => {
  const data = c.req.valid("json");

  const result = await db
    .prepare(
      "INSERT INTO readers (name, email, phone, address, birth_date) VALUES (?, ?, ?, ?, ?) RETURNING *"
    )
    .bind(data.name, data.email, data.phone, data.address || null, data.birth_date || null)
    .first();

  return c.json(result, 201);
});

app.put("/api/readers/:id", requireAdmin, zValidator("json", readerSchema), async (c) => {
  const id = parseInt(c.req.param("id"));
  const data = c.req.valid("json");

  const result = await db
    .prepare(
      "UPDATE readers SET name = ?, email = ?, phone = ?, address = ?, birth_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *"
    )
    .bind(data.name, data.email, data.phone, data.address || null, data.birth_date || null, id)
    .first();

  if (!result) {
    return c.json({ error: "Reader not found" }, 404);
  }

  return c.json(result);
});

app.delete("/api/readers/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param("id"));

  // Remove reader from all mass assignments
  await db
    .prepare(
      `UPDATE masses 
       SET first_reader_id = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE first_reader_id = ?`
    )
    .bind(id)
    .run();

  await db
    .prepare(
      `UPDATE masses 
       SET second_reader_id = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE second_reader_id = ?`
    )
    .bind(id)
    .run();

  await db
    .prepare(
      `UPDATE masses 
       SET psalm_reader_id = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE psalm_reader_id = ?`
    )
    .bind(id)
    .run();

  // Delete reader availability
  await db
    .prepare("DELETE FROM reader_availability WHERE reader_id = ?")
    .bind(id)
    .run();

  const result = await db
    .prepare("DELETE FROM readers WHERE id = ? RETURNING *")
    .bind(id)
    .first();

  if (!result) {
    return c.json({ error: "Reader not found" }, 404);
  }

  return c.json({ success: true });
});

// Reader availability endpoints
app.get("/api/readers/:id/availability", async (c) => {
  const readerId = parseInt(c.req.param("id"));

  const availability = await db
    .prepare("SELECT * FROM reader_availability WHERE reader_id = ? ORDER BY day_of_week, mass_time")
    .bind(readerId)
    .all();

  return c.json(availability.results);
});

app.put("/api/readers/:id/availability", requireAdmin, zValidator("json", readerAvailabilitySchema), async (c) => {
  const readerId = parseInt(c.req.param("id"));
  const data = c.req.valid("json");

  // Delete all existing availability for this reader
  await db
    .prepare("DELETE FROM reader_availability WHERE reader_id = ?")
    .bind(readerId)
    .run();

  // Insert new availability records
  for (const slot of data.availability) {
    await db
      .prepare(
        "INSERT INTO reader_availability (reader_id, day_of_week, mass_time) VALUES (?, ?, ?)"
      )
      .bind(readerId, slot.day_of_week, slot.mass_time)
      .run();
  }

  // Fetch and return updated availability
  const availability = await db
    .prepare("SELECT * FROM reader_availability WHERE reader_id = ? ORDER BY day_of_week, mass_time")
    .bind(readerId)
    .all();

  return c.json(availability.results);
});

// Get all reader availability (for auto-assignment)
app.get("/api/reader-availability", async (c) => {

  const availability = await db
    .prepare(`
      SELECT ra.*, r.name as reader_name, r.is_active
      FROM reader_availability ra
      JOIN readers r ON ra.reader_id = r.id
      WHERE r.is_active = 1
      ORDER BY ra.reader_id, ra.day_of_week, ra.mass_time
    `)
    .all();

  return c.json(availability.results);
});

// Mass endpoints
app.get("/api/masses", async (c) => {
  const masses = await db
    .prepare("SELECT * FROM masses ORDER BY mass_date, mass_time")
    .all();
  return c.json(masses.results);
});

app.post("/api/masses", requireAdmin, zValidator("json", massSchema), async (c) => {
  const data = c.req.valid("json");

  const result = await db
    .prepare(
      `INSERT INTO masses (
        mass_date, mass_time, mass_type, first_reading, psalm, 
        second_reading, gospel, has_second_reading, has_commentator, has_notes, notes,
        first_reader_id, second_reader_id, psalm_reader_id, commentator_reader_id,
        first_reader_custom, second_reader_custom, psalm_reader_custom, commentator_reader_custom
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    )
    .bind(
      data.mass_date,
      data.mass_time,
      data.mass_type || '',
      data.first_reading || null,
      data.psalm || null,
      data.second_reading || null,
      data.gospel || null,
      data.has_second_reading ?? 1,
      data.has_commentator ?? 0,
      data.has_notes ?? 0,
      data.notes || null,
      data.first_reader_id || null,
      data.second_reader_id || null,
      data.psalm_reader_id || null,
      data.commentator_reader_id || null,
      data.first_reader_custom || null,
      data.second_reader_custom || null,
      data.psalm_reader_custom || null,
      data.commentator_reader_custom || null
    )
    .first();

  return c.json(result, 201);
});

app.put("/api/masses/:id", requireAdmin, zValidator("json", massSchema), async (c) => {
  const id = parseInt(c.req.param("id"));
  const data = c.req.valid("json");

  const result = await db
    .prepare(
      `UPDATE masses SET 
        mass_date = ?, mass_time = ?, mass_type = ?, 
        first_reading = ?, psalm = ?, second_reading = ?, gospel = ?,
        has_second_reading = ?, has_commentator = ?, has_notes = ?, notes = ?,
        first_reader_id = ?, second_reader_id = ?, psalm_reader_id = ?, commentator_reader_id = ?,
        first_reader_custom = ?, second_reader_custom = ?, psalm_reader_custom = ?, commentator_reader_custom = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? RETURNING *`
    )
    .bind(
      data.mass_date,
      data.mass_time,
      data.mass_type || '',
      data.first_reading || null,
      data.psalm || null,
      data.second_reading || null,
      data.gospel || null,
      data.has_second_reading ?? 1,
      data.has_commentator ?? 0,
      data.has_notes ?? 0,
      data.notes || null,
      data.first_reader_id || null,
      data.second_reader_id || null,
      data.psalm_reader_id || null,
      data.commentator_reader_id || null,
      data.first_reader_custom || null,
      data.second_reader_custom || null,
      data.psalm_reader_custom || null,
      data.commentator_reader_custom || null,
      id
    )
    .first();

  if (!result) {
    return c.json({ error: "Mass not found" }, 404);
  }

  return c.json(result);
});

app.put(
  "/api/masses/:id/assignments",
  requireAdmin,
  zValidator("json", assignmentSchema),
  async (c) => {
    const id = parseInt(c.req.param("id"));
    const data = c.req.valid("json");

    const result = await db
      .prepare(
        `UPDATE masses SET 
          first_reader_id = ?, 
          second_reader_id = ?, 
          psalm_reader_id = ?,
          commentator_reader_id = ?,
          first_reader_custom = ?,
          second_reader_custom = ?,
          psalm_reader_custom = ?,
          commentator_reader_custom = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? RETURNING *`
      )
      .bind(
        data.first_reader_id ?? null,
        data.second_reader_id ?? null,
        data.psalm_reader_id ?? null,
        data.commentator_reader_id ?? null,
        data.first_reader_custom ?? null,
        data.second_reader_custom ?? null,
        data.psalm_reader_custom ?? null,
        data.commentator_reader_custom ?? null,
        id
      )
      .first();

    if (!result) {
      return c.json({ error: "Mass not found" }, 404);
    }

    return c.json(result);
  }
);

app.delete("/api/masses/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param("id"));

  const result = await db
    .prepare("DELETE FROM masses WHERE id = ? RETURNING *")
    .bind(id)
    .first();

  if (!result) {
    return c.json({ error: "Mass not found" }, 404);
  }

  return c.json({ success: true });
});

// Copy schedule endpoint
const copyScheduleSchema = z.object({
  source_start_date: z.string(),
  source_end_date: z.string(),
  dest_start_date: z.string(),
  dest_end_date: z.string(),
  include_readers: z.boolean(),
});

const specialCelebrationSchema = z.object({
  name: z.string().min(1),
  celebration_date: z.string(),
  celebration_time: z.string(),
  description: z.string().nullable().optional(),
});

const celebrationRolesSchema = z.object({
  roles: z.array(z.object({
    role_name: z.string().min(1),
    reader_id: z.number().nullable().optional(),
    custom_reader_name: z.string().nullable().optional(),
    role_order: z.number(),
  })),
});

app.post("/api/masses/copy-schedule", requireAdmin, zValidator("json", copyScheduleSchema), async (c) => {
  const data = c.req.valid("json");

  // Fetch all masses in the source date range
  const sourceMasses = await db
    .prepare(
      `SELECT * FROM masses 
       WHERE mass_date >= ? AND mass_date <= ? 
       ORDER BY mass_date, mass_time`
    )
    .bind(data.source_start_date, data.source_end_date)
    .all();

  if (!sourceMasses.results || sourceMasses.results.length === 0) {
    return c.json({ error: "No se encontraron misas en el rango de fechas origen" }, 400);
  }

  // Calculate the date offset
  const sourceStart = new Date(data.source_start_date + 'T00:00:00');
  const destStart = new Date(data.dest_start_date + 'T00:00:00');
  const dayOffset = Math.floor((destStart.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24));

  // Create new masses for the destination range
  const createdMasses = [];
  for (const sourceMass of sourceMasses.results as any[]) {
    const sourceDate = new Date(sourceMass.mass_date + 'T00:00:00');
    const destDate = new Date(sourceDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const destDateStr = destDate.toISOString().split('T')[0];

    const newMass = await db
      .prepare(
        `INSERT INTO masses (
          mass_date, mass_time, mass_type, first_reading, psalm, 
          second_reading, gospel, has_second_reading, has_commentator, has_notes, notes,
          first_reader_id, second_reader_id, psalm_reader_id, commentator_reader_id,
          first_reader_custom, second_reader_custom, psalm_reader_custom, commentator_reader_custom
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
      )
      .bind(
        destDateStr,
        sourceMass.mass_time,
        sourceMass.mass_type,
        sourceMass.first_reading,
        sourceMass.psalm,
        sourceMass.second_reading,
        sourceMass.gospel,
        sourceMass.has_second_reading,
        sourceMass.has_commentator,
        sourceMass.has_notes,
        sourceMass.notes,
        data.include_readers ? sourceMass.first_reader_id : null,
        data.include_readers ? sourceMass.second_reader_id : null,
        data.include_readers ? sourceMass.psalm_reader_id : null,
        data.include_readers ? sourceMass.commentator_reader_id : null,
        data.include_readers ? sourceMass.first_reader_custom : null,
        data.include_readers ? sourceMass.second_reader_custom : null,
        data.include_readers ? sourceMass.psalm_reader_custom : null,
        data.include_readers ? sourceMass.commentator_reader_custom : null
      )
      .first();

    createdMasses.push(newMass);
  }

  return c.json({ 
    success: true, 
    created_count: createdMasses.length,
    masses: createdMasses 
  });
});

// Fetch daily readings from Ciudad Redonda
app.get("/api/readings/:date", async (c) => {
  const date = c.req.param("date");
  
  try {
    // First, check if readings are cached in database
    const cached = await db
      .prepare("SELECT * FROM cached_readings WHERE reading_date = ?")
      .bind(date)
      .first();
    
    if (cached) {
      return c.json({
        date: date,
        readings: {
          first_reading: cached.first_reading,
          psalm: cached.psalm,
          second_reading: cached.second_reading,
          gospel: cached.gospel,
          mass_type: cached.mass_type,
          liturgical_day: cached.liturgical_day,
          first_reading_text: cached.first_reading_text,
          psalm_text: cached.psalm_text,
          second_reading_text: cached.second_reading_text,
          gospel_text: cached.gospel_text
        },
        cached: true
      });
    }
    
    // Fetch readings from Ciudad Redonda
    // Note: Currently only supports today's readings
    // Future enhancement: implement date-specific fetching using Ciudad Redonda's calendar system
    const readings = await fetchReadingsFromCiudadRedonda(date);
    
    // Cache the readings in database
    await db
      .prepare(
        `INSERT INTO cached_readings (
          reading_date, mass_type, liturgical_day,
          first_reading, first_reading_text,
          psalm, psalm_text,
          second_reading, second_reading_text,
          gospel, gospel_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(reading_date) DO UPDATE SET
          mass_type = excluded.mass_type,
          liturgical_day = excluded.liturgical_day,
          first_reading = excluded.first_reading,
          first_reading_text = excluded.first_reading_text,
          psalm = excluded.psalm,
          psalm_text = excluded.psalm_text,
          second_reading = excluded.second_reading,
          second_reading_text = excluded.second_reading_text,
          gospel = excluded.gospel,
          gospel_text = excluded.gospel_text,
          updated_at = CURRENT_TIMESTAMP`
      )
      .bind(
        date,
        readings.mass_type,
        readings.liturgical_day,
        readings.first_reading,
        readings.first_reading_text,
        readings.psalm,
        readings.psalm_text,
        readings.second_reading,
        readings.second_reading_text,
        readings.gospel,
        readings.gospel_text
      )
      .run();
    
    return c.json({
      date: date,
      readings: readings,
      cached: false
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Failed to fetch readings for ${date}: ${errorMessage}`);
    
    // Return a response with empty readings instead of 500 error
    // This allows the frontend to handle it gracefully
    return c.json({ 
      date: date,
      readings: {
        first_reading: null,
        psalm: null,
        second_reading: null,
        gospel: null,
        mass_type: null,
        liturgical_day: null,
        first_reading_text: null,
        psalm_text: null,
        second_reading_text: null,
        gospel_text: null
      },
      cached: false,
      error: 'Las lecturas no están disponibles temporalmente. Intente de nuevo más tarde.',
      error_details: errorMessage
    });
  }
});

// AI Content endpoints - Lectio Divina
app.get("/api/lectio-divina/:date", async (c) => {
  const date = c.req.param("date");
  const apiKey = process.env.GEMINI_API_KEY as string;
  
  try {
    // Check for cached AI content first
    const cachedAI = await db
      .prepare("SELECT content FROM cached_ai_content WHERE content_date = ? AND content_type = 'lectio_divina'")
      .bind(date)
      .first<{ content: string }>();
    
    if (cachedAI) {
      return c.json(JSON.parse(cachedAI.content));
    }
    
    // No cache, need to generate - check API key
    if (!apiKey) {
      return c.json({ error: 'GEMINI_API_KEY not configured' }, 500);
    }
    
    // Get the readings for this date
    let readings: any = null;
    
    // Check readings cache first
    const cached = await db
      .prepare("SELECT * FROM cached_readings WHERE reading_date = ?")
      .bind(date)
      .first();
    
    if (cached) {
      readings = {
        first_reading: cached.first_reading,
        first_reading_text: cached.first_reading_text,
        psalm: cached.psalm,
        psalm_text: cached.psalm_text,
        second_reading: cached.second_reading,
        second_reading_text: cached.second_reading_text,
        gospel: cached.gospel,
        gospel_text: cached.gospel_text,
        liturgical_day: cached.liturgical_day,
      };
    } else {
      // Fetch from Ciudad Redonda
      readings = await fetchReadingsFromCiudadRedonda(date);
    }
    
    if (!readings.gospel_text) {
      return c.json({ error: 'No hay lecturas disponibles para esta fecha' }, 404);
    }
    
    // Generate Lectio Divina content
    const lectioDivina = await generateLectioDivina(apiKey, readings);
    
    // Verify we got valid content (not empty strings)
    if (!lectioDivina.lectio || !lectioDivina.meditatio || !lectioDivina.oratio || 
        !lectioDivina.contemplatio || !lectioDivina.actio) {
      return c.json({ 
        error: 'No se pudo generar contenido válido',
        message: 'La inteligencia artificial no pudo generar el contenido. Por favor, intenta de nuevo.'
      }, 500);
    }
    
    // Transform to expected format with title and content
    const formattedLectioDivina = {
      lectio: {
        title: "Lectio (Lectura)",
        content: lectioDivina.lectio
      },
      meditatio: {
        title: "Meditatio (Meditación)",
        content: lectioDivina.meditatio
      },
      oratio: {
        title: "Oratio (Oración)",
        content: lectioDivina.oratio
      },
      contemplatio: {
        title: "Contemplatio (Contemplación)",
        content: lectioDivina.contemplatio
      },
      actio: {
        title: "Actio (Acción)",
        content: lectioDivina.actio
      }
    };
    
    const response = {
      date,
      liturgical_day: readings.liturgical_day,
      lectio_divina: formattedLectioDivina
    };
    
    // Cache the generated content
    await db.prepare(
      `INSERT INTO cached_ai_content (content_date, content_type, content, created_at, updated_at)
       VALUES (?, 'lectio_divina', ?, now(), now())
       ON CONFLICT(content_date, content_type) DO UPDATE SET content = excluded.content, updated_at = now()`
    ).bind(date, JSON.stringify(response)).run();
    
    return c.json(response);
    
  } catch (error: any) {
    console.error('Error generating Lectio Divina:', error);
    
    // Check for quota exceeded error
    if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('429')) {
      return c.json({ 
        error: 'Límite diario alcanzado',
        message: 'El servicio de inteligencia artificial ha alcanzado su límite diario. Por favor, intenta de nuevo mañana.',
        isQuotaError: true
      }, 429);
    }
    
    return c.json({ 
      error: 'Error al generar la Lectio Divina',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// AI Content endpoints - Cantos Sugeridos
app.get("/api/cantos-sugeridos/:date", async (c) => {
  const date = c.req.param("date");
  const apiKey = process.env.GEMINI_API_KEY as string;
  
  try {
    // Check for cached AI content first
    const cachedAI = await db
      .prepare("SELECT content FROM cached_ai_content WHERE content_date = ? AND content_type = 'cantos'")
      .bind(date)
      .first<{ content: string }>();
    
    if (cachedAI) {
      return c.json(JSON.parse(cachedAI.content));
    }
    
    // No cache, need to generate - check API key
    if (!apiKey) {
      return c.json({ error: 'GEMINI_API_KEY not configured' }, 500);
    }
    
    // Get the readings for this date
    let readings: any = null;
    
    // Check readings cache first
    const cached = await db
      .prepare("SELECT * FROM cached_readings WHERE reading_date = ?")
      .bind(date)
      .first();
    
    if (cached) {
      readings = {
        first_reading: cached.first_reading,
        first_reading_text: cached.first_reading_text,
        psalm: cached.psalm,
        psalm_text: cached.psalm_text,
        second_reading: cached.second_reading,
        second_reading_text: cached.second_reading_text,
        gospel: cached.gospel,
        gospel_text: cached.gospel_text,
        liturgical_day: cached.liturgical_day,
      };
    } else {
      // Fetch from Ciudad Redonda
      readings = await fetchReadingsFromCiudadRedonda(date);
    }
    
    if (!readings.gospel_text) {
      return c.json({ error: 'No hay lecturas disponibles para esta fecha' }, 404);
    }
    
    // Generate suggested songs
    const cantos = await generateCantosSugeridos(apiKey, readings);
    
    // Verify we got valid content
    if (!cantos.cantos || cantos.cantos.length === 0) {
      return c.json({ 
        error: 'No se pudieron generar los cantos',
        message: 'La inteligencia artificial no pudo generar el contenido. Por favor, intenta de nuevo.'
      }, 500);
    }
    
    const response = {
      date,
      liturgical_day: readings.liturgical_day,
      cantos: cantos.cantos
    };
    
    // Cache the generated content
    await db.prepare(
      `INSERT INTO cached_ai_content (content_date, content_type, content, created_at, updated_at)
       VALUES (?, 'cantos', ?, now(), now())
       ON CONFLICT(content_date, content_type) DO UPDATE SET content = excluded.content, updated_at = now()`
    ).bind(date, JSON.stringify(response)).run();
    
    return c.json(response);
    
  } catch (error: any) {
    console.error('Error generating Cantos:', error);
    
    // Check for quota exceeded error
    if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('429')) {
      return c.json({ 
        error: 'Límite diario alcanzado',
        message: 'El servicio de inteligencia artificial ha alcanzado su límite diario. Por favor, intenta de nuevo mañana.',
        isQuotaError: true
      }, 429);
    }
    
    return c.json({ 
      error: 'Error al generar los cantos sugeridos',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Endpoint to clear cached AI content (admin only)
app.delete("/api/cached-ai-content/:date", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const token = authHeader.replace("Bearer ", "");
  const sessionResult = await db.prepare(
    "SELECT role FROM auth_sessions WHERE token = ? AND expires_at > ?"
  ).bind(token, Date.now()).first();
  const session = sessionResult as { role: string } | null;
  
  if (!session || session.role !== "admin") {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const date = c.req.param("date");
  
  try {
    await db.prepare("DELETE FROM cached_ai_content WHERE content_date = ?").bind(date).run();
    return c.json({ success: true, message: `Caché eliminado para ${date}` });
  } catch (error) {
    console.error('Error deleting cached AI content:', error);
    return c.json({ error: 'Error al eliminar caché' }, 500);
  }
});

// Special Celebrations endpoints
app.get("/api/special-celebrations", async (c) => {
  
  // Fetch all celebrations
  const celebrations = await db
    .prepare("SELECT * FROM special_celebrations ORDER BY celebration_date, celebration_time")
    .all();
  
  // Fetch roles for each celebration
  const celebrationsWithRoles = await Promise.all(
    (celebrations.results as any[]).map(async (celebration) => {
      const roles = await db
        .prepare("SELECT * FROM celebration_roles WHERE celebration_id = ? ORDER BY role_order")
        .bind(celebration.id)
        .all();
      
      return {
        ...celebration,
        roles: roles.results,
      };
    })
  );
  
  return c.json(celebrationsWithRoles);
});

app.post("/api/special-celebrations", requireAdmin, zValidator("json", specialCelebrationSchema), async (c) => {
  const data = c.req.valid("json");

  const result = await db
    .prepare(
      `INSERT INTO special_celebrations (name, celebration_date, celebration_time, description) 
       VALUES (?, ?, ?, ?) RETURNING *`
    )
    .bind(data.name, data.celebration_date, data.celebration_time, data.description || null)
    .first();

  return c.json(result, 201);
});

app.put("/api/special-celebrations/:id", requireAdmin, zValidator("json", specialCelebrationSchema), async (c) => {
  const id = parseInt(c.req.param("id"));
  const data = c.req.valid("json");

  const result = await db
    .prepare(
      `UPDATE special_celebrations 
       SET name = ?, celebration_date = ?, celebration_time = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? RETURNING *`
    )
    .bind(data.name, data.celebration_date, data.celebration_time, data.description || null, id)
    .first();

  if (!result) {
    return c.json({ error: "Celebration not found" }, 404);
  }

  return c.json(result);
});

app.delete("/api/special-celebrations/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param("id"));

  // Delete all roles associated with this celebration first
  await db
    .prepare("DELETE FROM celebration_roles WHERE celebration_id = ?")
    .bind(id)
    .run();

  // Delete the celebration
  const result = await db
    .prepare("DELETE FROM special_celebrations WHERE id = ? RETURNING *")
    .bind(id)
    .first();

  if (!result) {
    return c.json({ error: "Celebration not found" }, 404);
  }

  return c.json({ success: true });
});

app.put("/api/special-celebrations/:id/roles", requireAdmin, zValidator("json", celebrationRolesSchema), async (c) => {
  const celebrationId = parseInt(c.req.param("id"));
  const data = c.req.valid("json");

  // Delete all existing roles for this celebration
  await db
    .prepare("DELETE FROM celebration_roles WHERE celebration_id = ?")
    .bind(celebrationId)
    .run();

  // Insert new roles
  for (const role of data.roles) {
    await db
      .prepare(
        `INSERT INTO celebration_roles (celebration_id, role_name, reader_id, custom_reader_name, role_order) 
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        celebrationId,
        role.role_name,
        role.reader_id || null,
        role.custom_reader_name || null,
        role.role_order
      )
      .run();
  }

  // Fetch updated celebration with roles
  const celebration = await db
    .prepare("SELECT * FROM special_celebrations WHERE id = ?")
    .bind(celebrationId)
    .first();

  const roles = await db
    .prepare("SELECT * FROM celebration_roles WHERE celebration_id = ? ORDER BY role_order")
    .bind(celebrationId)
    .all();

  return c.json({
    ...celebration,
    roles: roles.results,
  });
});

// Refresh cached readings for a specific date (admin only)
app.post("/api/readings/:date/refresh", requireAdmin, async (c) => {
  const date = c.req.param("date");
  
  try {
    // Delete cached reading for this date
    await db
      .prepare("DELETE FROM cached_readings WHERE reading_date = ?")
      .bind(date)
      .run();
    
    // Fetch fresh readings from Ciudad Redonda
    const readings = await fetchReadingsFromCiudadRedonda(date);
    
    // Cache the new readings
    await db
      .prepare(
        `INSERT INTO cached_readings (
          reading_date, mass_type, liturgical_day,
          first_reading, first_reading_text,
          psalm, psalm_text,
          second_reading, second_reading_text,
          gospel, gospel_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        date,
        readings.mass_type,
        readings.liturgical_day,
        readings.first_reading,
        readings.first_reading_text,
        readings.psalm,
        readings.psalm_text,
        readings.second_reading,
        readings.second_reading_text,
        readings.gospel,
        readings.gospel_text
      )
      .run();
    
    return c.json({
      success: true,
      date: date,
      readings: readings
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide user-friendly error messages
    let userMessage = errorMessage;
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
      userMessage = 'No se pudo conectar con Ciudad Redonda. El servidor externo puede estar temporalmente no disponible. Por favor, intente de nuevo en unos minutos.';
    } else if (errorMessage.includes('Failed to fetch after')) {
      userMessage = 'La conexión con Ciudad Redonda falló después de varios intentos. Por favor, intente de nuevo más tarde.';
    }
    
    return c.json({ 
      error: 'Failed to refresh readings',
      message: userMessage
    }, 500);
  }
});

// Refresh cached readings for a date range (admin only)
const refreshRangeSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
});

app.post("/api/readings/refresh-range", requireAdmin, zValidator("json", refreshRangeSchema), async (c) => {
  const data = c.req.valid("json");
  
  try {
    const startDate = new Date(data.start_date + 'T00:00:00');
    const endDate = new Date(data.end_date + 'T00:00:00');
    
    if (startDate > endDate) {
      return c.json({ error: 'La fecha de inicio debe ser anterior a la fecha final' }, 400);
    }
    
    // Calculate number of days
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Limit to 90 days to prevent timeouts
    if (daysDiff > 90) {
      return c.json({ error: 'El rango no puede exceder 90 días' }, 400);
    }
    
    const results = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      try {
        // Delete cached reading for this date
        await db
          .prepare("DELETE FROM cached_readings WHERE reading_date = ?")
          .bind(dateStr)
          .run();
        
        // Fetch fresh readings from Ciudad Redonda
        const readings = await fetchReadingsFromCiudadRedonda(dateStr);
        
        // Only insert if we got readings (not all dates have readings)
        if (readings.first_reading || readings.gospel) {
          await db
            .prepare(
              `INSERT INTO cached_readings (
                reading_date, mass_type, liturgical_day,
                first_reading, first_reading_text,
                psalm, psalm_text,
                second_reading, second_reading_text,
                gospel, gospel_text
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              dateStr,
              readings.mass_type,
              readings.liturgical_day,
              readings.first_reading,
              readings.first_reading_text,
              readings.psalm,
              readings.psalm_text,
              readings.second_reading,
              readings.second_reading_text,
              readings.gospel,
              readings.gospel_text
            )
            .run();
          
          results.push({ date: dateStr, success: true });
        } else {
          results.push({ 
            date: dateStr, 
            success: false, 
            error: 'No se encontraron lecturas para esta fecha' 
          });
        }
      } catch (error) {
        console.error(`Error fetching readings for ${dateStr}:`, error);
        results.push({ 
          date: dateStr, 
          success: false, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return c.json({
      success: true,
      results: results,
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
    
  } catch (error) {
    console.error('Error in refresh-range endpoint:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Error al procesar la solicitud'
    }, 500);
  }
});

// Auto-assignment algorithm endpoint
const autoAssignSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  preview: z.boolean().optional().default(true),
});

app.post("/api/auto-assign", requireAdmin, zValidator("json", autoAssignSchema), async (c) => {
  const data = c.req.valid("json");
  
  try {
    // Get all masses in the date range
    const masses = await db
      .prepare(
        `SELECT * FROM masses 
         WHERE mass_date >= ? AND mass_date <= ? 
         ORDER BY mass_date, mass_time`
      )
      .bind(data.start_date, data.end_date)
      .all();
    
    if (!masses.results || masses.results.length === 0) {
      return c.json({ error: "No se encontraron misas en el rango de fechas" }, 400);
    }
    
    // Get all active readers
    const readers = await db
      .prepare("SELECT * FROM readers WHERE is_active = 1")
      .all();
    
    if (!readers.results || readers.results.length === 0) {
      return c.json({ error: "No hay proclamadores activos" }, 400);
    }
    
    // Get all reader availability
    const availability = await db
      .prepare("SELECT * FROM reader_availability")
      .all();
    
    // Create availability map: reader_id -> Set of "day-time" keys
    const availabilityMap = new Map<number, Set<string>>();
    for (const a of availability.results as any[]) {
      if (!availabilityMap.has(a.reader_id)) {
        availabilityMap.set(a.reader_id, new Set());
      }
      availabilityMap.get(a.reader_id)!.add(`${a.day_of_week}-${a.mass_time}`);
    }
    
    // Get recent assignments to calculate participation count
    // Look at the last 30 days + the requested range
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const lookbackDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    const recentMasses = await db
      .prepare(
        `SELECT first_reader_id, second_reader_id, psalm_reader_id, commentator_reader_id 
         FROM masses WHERE mass_date >= ?`
      )
      .bind(lookbackDate)
      .all();
    
    // Count participations per reader
    const participationCount = new Map<number, number>();
    for (const m of recentMasses.results as any[]) {
      [m.first_reader_id, m.second_reader_id, m.psalm_reader_id, m.commentator_reader_id]
        .filter(id => id !== null)
        .forEach(id => {
          participationCount.set(id, (participationCount.get(id) || 0) + 1);
        });
    }
    
    // Track assignments within this batch to avoid over-assigning
    const batchAssignments = new Map<number, number>();
    
    // Helper function to get available readers for a mass
    const getAvailableReaders = (massDate: string, massTime: string, excludeIds: number[]) => {
      const date = new Date(massDate + 'T00:00:00');
      const dayOfWeek = date.getDay();
      const key = `${dayOfWeek}-${massTime}`;
      
      return (readers.results as any[])
        .filter(reader => {
          // Check if reader is available for this slot
          const readerAvail = availabilityMap.get(reader.id);
          if (!readerAvail || !readerAvail.has(key)) return false;
          // Exclude already assigned readers for this mass
          if (excludeIds.includes(reader.id)) return false;
          return true;
        })
        .sort((a, b) => {
          // Sort by participation count (ascending) + batch assignments
          const aCount = (participationCount.get(a.id) || 0) + (batchAssignments.get(a.id) || 0);
          const bCount = (participationCount.get(b.id) || 0) + (batchAssignments.get(b.id) || 0);
          return aCount - bCount;
        });
    };
    
    const assignments = [];
    
    for (const mass of masses.results as any[]) {
      const excludeIds: number[] = [];
      const assignment: any = {
        mass_id: mass.id,
        mass_date: mass.mass_date,
        mass_time: mass.mass_time,
        mass_type: mass.mass_type,
        original: {
          first_reader_id: mass.first_reader_id,
          second_reader_id: mass.second_reader_id,
          psalm_reader_id: mass.psalm_reader_id,
          commentator_reader_id: mass.commentator_reader_id,
        },
        proposed: {
          first_reader_id: null,
          second_reader_id: null,
          psalm_reader_id: null,
          commentator_reader_id: null,
        },
      };
      
      // Assign first reader
      let available = getAvailableReaders(mass.mass_date, mass.mass_time, excludeIds);
      if (available.length > 0) {
        assignment.proposed.first_reader_id = available[0].id;
        excludeIds.push(available[0].id);
        batchAssignments.set(available[0].id, (batchAssignments.get(available[0].id) || 0) + 1);
      }
      
      // Assign second reader (if mass has second reading)
      if (mass.has_second_reading) {
        available = getAvailableReaders(mass.mass_date, mass.mass_time, excludeIds);
        if (available.length > 0) {
          assignment.proposed.second_reader_id = available[0].id;
          excludeIds.push(available[0].id);
          batchAssignments.set(available[0].id, (batchAssignments.get(available[0].id) || 0) + 1);
        }
      }
      
      // Assign psalm reader
      available = getAvailableReaders(mass.mass_date, mass.mass_time, excludeIds);
      if (available.length > 0) {
        assignment.proposed.psalm_reader_id = available[0].id;
        excludeIds.push(available[0].id);
        batchAssignments.set(available[0].id, (batchAssignments.get(available[0].id) || 0) + 1);
      }
      
      // Assign commentator (if mass has commentator)
      if (mass.has_commentator) {
        available = getAvailableReaders(mass.mass_date, mass.mass_time, excludeIds);
        if (available.length > 0) {
          assignment.proposed.commentator_reader_id = available[0].id;
          excludeIds.push(available[0].id);
          batchAssignments.set(available[0].id, (batchAssignments.get(available[0].id) || 0) + 1);
        }
      }
      
      assignments.push(assignment);
    }
    
    // If not preview mode, apply the assignments
    if (!data.preview) {
      for (const assignment of assignments) {
        await db
          .prepare(
            `UPDATE masses SET 
              first_reader_id = ?, 
              second_reader_id = ?, 
              psalm_reader_id = ?, 
              commentator_reader_id = ?,
              updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`
          )
          .bind(
            assignment.proposed.first_reader_id,
            assignment.proposed.second_reader_id,
            assignment.proposed.psalm_reader_id,
            assignment.proposed.commentator_reader_id,
            assignment.mass_id
          )
          .run();
      }
    }
    
    // Get reader names for the response
    const readerMap = new Map<number, string>();
    for (const r of readers.results as any[]) {
      readerMap.set(r.id, r.name);
    }
    
    // Enrich assignments with reader names
    const enrichedAssignments = assignments.map(a => ({
      ...a,
      proposed_names: {
        first_reader: a.proposed.first_reader_id ? readerMap.get(a.proposed.first_reader_id) : null,
        second_reader: a.proposed.second_reader_id ? readerMap.get(a.proposed.second_reader_id) : null,
        psalm_reader: a.proposed.psalm_reader_id ? readerMap.get(a.proposed.psalm_reader_id) : null,
        commentator: a.proposed.commentator_reader_id ? readerMap.get(a.proposed.commentator_reader_id) : null,
      }
    }));
    
    return c.json({
      success: true,
      preview: data.preview,
      total_masses: assignments.length,
      assignments: enrichedAssignments,
    });
    
  } catch (error) {
    console.error('Error in auto-assign endpoint:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Error al procesar la solicitud'
    }, 500);
  }
});

// Makes routing problems diagnosable: reports the path Hono actually received, which
// is what reveals a misconfigured rewrite (e.g. the original path not being preserved).
app.notFound((c) =>
  c.json({ error: "Ruta no encontrada", path: new URL(c.req.url).pathname }, 404)
);

export default app;
