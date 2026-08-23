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

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add your Supabase Postgres connection string as an environment variable."
  );
}

// Supabase's connection pooler (recommended for serverless) runs in PgBouncer "transaction"
// mode, which doesn't support server-side prepared statements — so `prepare: false` is required.
// `max: 1` keeps each serverless function instance from opening more than one connection.
const sql = postgres(connectionString, {
  ssl: "require",
  prepare: false,
  max: 1,
  idle_timeout: 20,
});

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

  async first<T = any>(): Promise<T | null> {
    const rows = await sql.unsafe(toPositionalParams(this.text), this.params as any[]);
    return (rows[0] as T) ?? null;
  }

  async all<T = any>(): Promise<{ results: T[] }> {
    const rows = await sql.unsafe(toPositionalParams(this.text), this.params as any[]);
    return { results: rows as unknown as T[] };
  }

  async run<T = any>(): Promise<{ results: T[] }> {
    const rows = await sql.unsafe(toPositionalParams(this.text), this.params as any[]);
    return { results: rows as unknown as T[] };
  }
}

export const db = {
  prepare(text: string): PreparedStatement {
    return new PreparedStatement(text);
  },
};
