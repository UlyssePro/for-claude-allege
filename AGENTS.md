# HMS-GS — Agent Guidelines

## Base44 dev environment
- Run: `docker compose -f docker-compose.base44.yml up -d` (web on port 3000, socket.io on port 3001)
- Image: `node:22-slim`, source bind-mounted at `/app`; `node_modules` and `.next` in named volumes
- `npm install --ignore-scripts` at startup (generated Prisma client is committed, so `prisma generate` is optional)
- Dev command runs `next dev --turbopack --hostname 0.0.0.0` + `tsx src/socket-server.ts` via concurrently
- `next.config.ts` has `allowedDevOrigins` derived from `BASE44_PUBLIC_HOST_SUFFIX` so the preview proxy origin is accepted
- No external secrets needed — SQLite (`dev.db`) is local and committed; `AUTH_SECRET` is a dev placeholder in `.env.base44-defaults`
- Login: `admin` / `admin123`

## Stack
- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind
- **Prisma 7** client via `@prisma/adapter-libsql` (SQLite local: `file:./dev.db`)
- **Sonner** toasts, **jsPDF** PDF export (client), **better-sqlite3** migration script
- Auth: custom session cookies (`auth_session`), `bcryptjs` for passwords
  - Login: `admin`/`admin123`; role normalization: `normalizeRole()` → `"admin" | "prof" | "eleve"`

## Conventions
- All admin pages live in `src/app/admin/*` with persistent `layout.tsx` sidebar
- Sidebar filters `menuItems` by `roles: ["admin","prof","eleve"]`
- API routes: `src/app/api/*` using Prisma client (`prisma` from `@/lib/prisma`)
- `orderBy` multi-col: must use array syntax `[{ col: "asc" }]`
- Enum fields (e.g. `StatutPointage`) need `INSERT OR IGNORE` with STRING literal values (not numeric)
- Use `showConfirmToast({title, description, destructive})` for destructive actions
- Use `Dialog` (modal) for create forms, not inline forms
- Use `toast.success/error/info` from sonner for feedback

## Dev commands
- `npm run dev` — Turbopack dev server (port 3000)
- `npx tsc --noEmit` — type check (ignore `application/` legacy errors)
- `npm run prisma:studio` — inspect DB
- Migration (re-run from db.json): `npx tsx prisma/migrate.ts` then `npx tsx prisma/seed-passwords.ts`

## Known legacy issues (do NOT port `application/` directly)
- `application/` uses broken imports (`@/src/...`), `jspdf` missing, TypeScript errors — do NOT fix
- `application/` is the old React SPA; rewrite features in `/admin` pages instead
