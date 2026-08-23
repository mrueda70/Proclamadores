# Despliegue en Supabase + Vercel

Esta app se migró desde Mocha (Cloudflare Workers + D1) a:

- **Vercel**: hosting del frontend (Vite/React) + la API (antes un Worker de Hono, ahora una
  Vercel Function que corre el mismo código Hono vía el adaptador `hono/vercel`).
- **Supabase**: base de datos Postgres (antes Cloudflare D1/SQLite).

La autenticación PIN propia de la app (`admin_pin`, `auth_sessions`) se mantuvo tal cual —
es la que realmente usa la app. El login por Google vía Mocha (`@getmocha/users-service`) nunca
estaba conectado a ninguna ruta y se eliminó del código.

## 1. Crear el proyecto en Supabase

1. Entra a https://supabase.com, crea una cuenta/organización y un proyecto nuevo.
2. Elige una contraseña de base de datos segura y guárdala.
3. Ve a **SQL Editor** y ejecuta, en este orden:
   1. El contenido de [`supabase/schema.sql`](../supabase/schema.sql) — crea las tablas.
   2. El contenido de [`supabase/data.sql`](../supabase/data.sql) — carga los datos actuales
      (lectores, misas, celebraciones especiales, el PIN de admin, lecturas y contenido de IA
      ya cacheados).
4. Ve a **Project Settings → Database → Connection string**, pestaña **URI**, y copia el string
   del **Connection pooling** (modo *Transaction*, puerto `6543`) — NO el de conexión directa.
   Reemplaza `[YOUR-PASSWORD]` por la contraseña que creaste. Ese es tu `DATABASE_URL`.

   > Se usa el pooler (Supavisor) porque las funciones serverless de Vercel abren y cierran
   > conexiones constantemente; con conexión directa se agotarían las conexiones de Postgres.

## 2. Configurar variables de entorno

Copia `.env.example` a `.env` para desarrollo local y complétalo:

- `DATABASE_URL`: el connection string del paso anterior.
- `GEMINI_API_KEY`: tu clave de Google Gemini (para Lectio Divina y cantos sugeridos).
- `RESEND_API_KEY`: tu clave de Resend (para el correo de alerta de PIN incorrecto).

## 3. Crear el proyecto en Vercel

1. Sube este repo a GitHub/GitLab/Bitbucket (o usa `vercel` CLI directo desde tu máquina).
2. En https://vercel.com, **Add New → Project**, importa el repo.
3. **Root Directory**: selecciona `code/` (la app vive en esa carpeta, no en la raíz del repo).
4. Framework Preset: Vercel debería detectar **Vite** automáticamente
   (build command `npm run build`, output `dist`).
5. En **Environment Variables**, agrega `DATABASE_URL`, `GEMINI_API_KEY` y `RESEND_API_KEY`
   (los mismos valores de tu `.env`) para los entornos Production y Preview.
6. Deploy.

La API queda expuesta bajo `/api/*` (misma ruta que usaba el Worker), servida por
[`api/index.ts`](../api/index.ts), y el resto de rutas cae al SPA (`vercel.json`
reescribe todo lo que no sea `/api/*` hacia `index.html`).

## 4. Probar localmente antes de desplegar

```bash
cd code
npm install
vercel link      # conecta esta carpeta a tu proyecto de Vercel (una sola vez)
vercel env pull  # baja las env vars de Vercel a .env.local, o usa tu .env manual
npm run dev:vercel   # levanta frontend + funciones /api juntos, como en producción
```

`npm run dev` (solo Vite) sirve para iterar en la UI, pero las llamadas a `/api/*` no
responderán — para eso hace falta `vercel dev` (o desplegar).

## 5. Después del primer deploy

- Actualiza `og:image`/`og:url` en [`index.html`](../index.html) si quieres que las tarjetas de
  vista previa (WhatsApp, redes) apunten a tu dominio final de Vercel.
- El PIN de administrador actual y la pregunta de seguridad ya vienen cargados desde
  `data.sql`; se pueden cambiar desde `/pin-management` una vez logueado como admin.
- Los tokens de sesión viejos no se migraron (no tiene sentido, ya vencieron o están por
  vencer) — todos deberán iniciar sesión de nuevo la primera vez.

## Notas sobre lo que se eliminó

- Rutas de Google OAuth (`/api/oauth/...`, `/api/sessions`, `src/worker/auth.ts`,
  `src/worker/middleware.ts`) y las páginas `Login.tsx` / `AuthCallback.tsx`: no estaban
  conectadas a ninguna ruta de la app (que usa `SimpleLogin.tsx` + PIN) y dependían de
  `@getmocha/users-service`, que ya no existe fuera de Mocha.
- El proxy `/api/background-image` (traía una imagen desde `mochausercontent.com`, que dejará
  de existir): la imagen se descargó a [`public/bg-image.png`](../public/bg-image.png) y ahora
  se sirve como archivo estático.
- El favicon y apple-touch-icon apuntaban a `static.getmocha.com`; también se descargaron a
  `public/` y se auto-hospedan.
- La tabla `user_roles` (del login de Google, sin uso) no se migró.

## Diagnóstico rápido (`/api/health`)

Si algo falla en producción, abre `https://TU-APP.vercel.app/api/health`. Devuelve JSON:

```json
{ "ok": true, "env": { "DATABASE_URL": true, ... }, "database": "conectada" }
```

Cómo leer el resultado:

- **404 con `{"error":"Ruta no encontrada","path":"..."}`**: la función SÍ responde; el problema
  es de enrutamiento. El campo `path` muestra la ruta que Hono recibió — si no coincide con la
  que pediste, el rewrite de `vercel.json` no está preservando la ruta original.
- **404 de Vercel ("The page could not be found")**: la función no se está mapeando. Revisa que
  exista `api/index.ts`, que `vercel.json` tenga el rewrite `/api/(.*)` -> `/api`, y que el Root
  Directory del proyecto en Vercel sea `code/`.
- **500 `FUNCTION_INVOCATION_FAILED`** (texto plano, no JSON): la función revienta al invocarse.
  Casi siempre es un adaptador equivocado: el directorio `api/` corre en runtime **Node**, que
  invoca `(req, res)`. Hay que usar `getRequestListener` de `@hono/node-server` — `handle` de
  `hono/vercel` devuelve un handler Web `(Request)` y falla en toda invocación.
- **`ok: false` con algún campo de `env` en `false`**: falta esa variable de entorno en Vercel.
- **`ok: false` con `database: "error"`**: la `DATABASE_URL` está mal o no es la del pooler.
  Debe apuntar al puerto `6543` (Transaction pooler), no al `5432` de conexión directa.

Los errores no controlados de la API ahora responden JSON (`{ error, message }`) en vez de un
500 opaco, así que la pestaña Network del navegador muestra la causa real.

## Restriccion importante: imports con extension en el codigo de la API

Vercel **no empaqueta** las funciones del directorio `api/`: transpila cada `.ts` a `.js` y los
ejecuta con el cargador **ESM nativo** de Node. Como `package.json` declara `"type": "module"`,
Node exige **extension explicita** en los imports relativos.

```ts
import { db } from "./db";      // rompe en produccion: ERR_MODULE_NOT_FOUND
import { db } from "./db.js";   // correcto (apunta al .ts, la extension es la del archivo emitido)
```

Esto aplica a todo el grafo de modulos alcanzable desde `api/` — es decir, `src/worker/**`.
NO aplica a `src/react-app/**`, que lo empaqueta Vite.

`tsconfig.worker.json` usa `"moduleResolution": "nodenext"` justamente para que esto sea un error
de compilacion (`TS2835`) y el build falle, en vez de desplegar una funcion que revienta al
arrancar. No cambies esa opcion a `bundler`: con ella `tsc` acepta los imports sin extension y el
fallo reaparece solo en produccion.

Ojo tambien con el alias `@/*`: funciona en el frontend (lo resuelve Vite) pero NO en el codigo
de la API, porque Node no conoce ese alias en tiempo de ejecucion. En `src/worker/**` usa solo
rutas relativas con extension.

### Como verificar el codigo de la API como lo ejecuta Vercel

Empaquetar con esbuild NO sirve para validar esto: el bundler resuelve los imports sin extension
y da un falso verde. Hay que transpilar sin empaquetar y ejecutar con el ESM nativo:

```bash
npx esbuild $(find src/worker api -name '*.ts') --outdir=.esmtest --outbase=.   --format=esm --platform=node
node -e "import('./.esmtest/api/index.js').then(()=>console.log('carga OK'))"
```
