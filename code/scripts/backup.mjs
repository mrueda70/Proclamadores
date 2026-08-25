/**
 * Respalda los datos de produccion (Supabase) a un archivo .sql restaurable.
 *
 *   npm run backup                -> backups/backup_2026-08-25_0330.sql (fecha y hora actuales)
 *   npm run backup -- 2026-08-24  -> backups/backup_2026-08-24.sql      (etiqueta indicada)
 *
 * Lee DATABASE_URL del entorno; si no esta definida, la toma del archivo .env.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const raizProyecto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Las variables ya presentes en el entorno tienen prioridad sobre el .env
function cargarEnv() {
  const ruta = path.join(raizProyecto, '.env');
  if (!fs.existsSync(ruta)) return;
  for (const linea of fs.readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
cargarEnv();

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL no esta definida (ni en el entorno ni en code/.env).');
  process.exit(1);
}

// Orden de restauracion: las tablas referenciadas van primero.
// auth_sessions se omite a proposito: son tokens de sesion, desechables, y guardarlos
// en un archivo seria exponer credenciales sin ninguna utilidad.
const TABLAS = [
  'readers',
  'masses',
  'special_celebrations',
  'celebration_roles',
  'reader_availability',
  'admin_pin',
  'cached_readings',
  'cached_ai_content',
];

const etiqueta = process.argv[2] || (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
})();

if (!/^[\w.-]+$/.test(etiqueta)) {
  console.error(`ERROR: etiqueta invalida "${etiqueta}". Usa solo letras, numeros, guiones y puntos.`);
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  prepare: false,
  max: 1,
  idle_timeout: 20,
  types: {
    // Igual que en src/worker/db.ts: conserva DATE/TIMESTAMP como el texto que envia
    // Postgres, para que el respaldo guarde "2026-08-24" y no un instante en UTC que
    // podria correrse un dia al restaurar.
    date: {
      to: 1184,
      from: [1082, 1114, 1184],
      parse: (v) => v,
      serialize: (v) => (v instanceof Date ? v : new Date(v)).toISOString(),
    },
  },
});

const literal = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  // Con standard_conforming_strings (por defecto) basta con duplicar las comillas simples
  return `'${String(v).replace(/'/g, "''")}'`;
};

try {
  const partes = [];
  const resumen = [];

  for (const tabla of TABLAS) {
    const filas = await sql.unsafe(`SELECT * FROM ${tabla} ORDER BY id`, []);
    resumen.push({ tabla, filas: filas.length });

    partes.push(`-- ${tabla} (${filas.length} filas)`);
    if (filas.length) {
      const cols = Object.keys(filas[0]);
      for (const f of filas) {
        partes.push(`INSERT INTO ${tabla} (${cols.join(', ')}) VALUES (${cols.map((c) => literal(f[c])).join(', ')});`);
      }
    }
    partes.push('');
  }

  partes.push('-- Sincroniza los contadores de id para que los proximos INSERT no choquen');
  for (const tabla of TABLAS) {
    partes.push(`SELECT setval(pg_get_serial_sequence('${tabla}','id'), COALESCE((SELECT MAX(id) FROM ${tabla}), 1), true);`);
  }

  const cabecera = [
    '-- ============================================================================',
    `-- Respaldo de los datos de produccion  ·  ${etiqueta}`,
    `-- Generado: ${new Date().toISOString()}`,
    '--',
    '-- CONTIENE DATOS PERSONALES (nombres, telefonos) y el PIN de administrador.',
    '-- Tratar como archivo confidencial: no subirlo al repositorio ni compartirlo.',
    '--',
    '-- COMO RESTAURAR, en el SQL Editor de Supabase:',
    '--   1. Sobre una base vacia: ejecutar antes supabase/schema.sql, luego este archivo.',
    '--   2. Sobre una base con datos: descomentar el bloque BORRADO de abajo. Eso',
    '--      ELIMINA los datos actuales y los reemplaza por los de este respaldo.',
    '--',
    '-- No incluye auth_sessions (tokens desechables); habra que iniciar sesion de nuevo.',
    '-- ============================================================================',
    '',
    '-- ---- BORRADO (descomentar solo para reemplazar los datos existentes) ----',
    ...[...TABLAS].reverse().map((t) => `-- DELETE FROM ${t};`),
    '-- -------------------------------------------------------------------------',
    '',
    'begin;',
    '',
  ];

  const destino = path.join(raizProyecto, 'backups', `backup_${etiqueta}.sql`);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, [...cabecera, ...partes, '', 'commit;', ''].join('\n'), 'utf8');

  const kb = (fs.statSync(destino).size / 1024).toFixed(1);
  console.log(`\nRespaldo creado: ${destino}  (${kb} KB)\n`);
  for (const r of resumen) console.log(`  ${r.tabla.padEnd(22)} ${String(r.filas).padStart(5)} filas`);
  console.log(`\n  TOTAL${' '.repeat(19)}${String(resumen.reduce((a, r) => a + r.filas, 0)).padStart(5)} filas\n`);
} catch (error) {
  console.error('\nFallo el respaldo:', error.message, '\n');
  process.exitCode = 1;
} finally {
  await sql.end();
}
