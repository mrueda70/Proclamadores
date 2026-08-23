import postgres from "postgres";

/**
 * Thin D1-compatible shim over Postgres.
 *
 * The original app was written against Cloudflare D1's
 * `db.prepare(sql).bind(...args).first()/.all()/.run()` API. Rather than rewrite every
 * query in the app, this module reproduces that same interface on top of a real Postgres
 * connection (Supabase), so the route handlers didn't need to change.
 *
 * `?` placeholders are translated to Postgres's `$1, $2, ...` positional placeholders.
 */

type Sql = ReturnType<typeof postgres>;

let client: Sql | null = null;

/**
 * The connection is created lazily rather than at import time: a missing DATABASE_URL
 * during module evaluation would crash the serverless function before any route runs,
 * turning every single endpoint into an opaque 500. Failing here instead lets the
 * error surface as a readable JSON response.
 */
function getClient(): Sql {
  if (client) return client;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL no está configurada. Agrégala en Vercel: Project Settings -> Environment Variables."
    );
  }

  // Supabase's connection pooler (recommended for serverless) runs in PgBouncer "transaction"
  // mode, which doesn't support server-side prepared statements — so `prepare: false` is required.
  // `max: 1` keeps each serverless function instance from opening more than one connection.
  client = postgres(connectionString, {
    ssl: "require",
    prepare: false,
    max: 1,
    idle_timeout: 20,
  });

  return client;
}

function toPositionalParams(query: string): string {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

class PreparedStatement {
  constructor(
    private readonly text: string,
    private readonly params: unknown[] = []
  ) {}

  bind(...args: unknown[]): PreparedStatement {
    return new PreparedStatement(this.text, args);
  }

  private execute(): Promise<any[]> {
    return getClient().unsafe(toPositionalParams(this.text), this.params as any[]) as any;
  }

  async first<T = any>(): Promise<T | null> {
    const rows = await this.execute();
    return (rows[0] as T) ?? null;
  }

  async all<T = any>(): Promise<{ results: T[] }> {
    const rows = await this.execute();
    return { results: rows as T[] };
  }

  async run<T = any>(): Promise<{ results: T[] }> {
    const rows = await this.execute();
    return { results: rows as T[] };
  }
}

export const db = {
  prepare(text: string): PreparedStatement {
    return new PreparedStatement(text);
  },
};

/** Round-trips a trivial query, used by the /api/health endpoint. */
export async function pingDatabase(): Promise<void> {
  await getClient().unsafe("SELECT 1", []);
}
