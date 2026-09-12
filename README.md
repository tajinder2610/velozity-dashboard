# Velozity Client Project Dashboard

A full-stack internal tool for managing client projects, tasks, and team activity in
real time, with strict role-based access for Admin / Project Manager / Developer.

Read **`Technology_Decisions.md`** first — it explains and justifies every
technology choice below (Express vs Fastify, Socket.io vs raw WebSocket, Prisma vs
raw SQL, node-cron vs Bull, token storage, frontend state, and the hosting split).
This README assumes those decisions and focuses on running the thing.

## Stack

- **Backend:** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Socket.io,
  node-cron, JWT (access + refresh), zod
- **Frontend:** React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS,
  socket.io-client

## Project layout

```
project/
├── Technology_Decisions.md   ← read this first
├── backend/                  ← Express API + Socket.io + cron, port 4000
└── frontend/                 ← React (Vite) app, port 5173
```

## Database schema

Six tables (full definitions in `backend/prisma/schema.prisma`):

```
User ──< Project ──< Task >── User (assignedTo)
  │           │          │
  │           │          ├──< ActivityLog >── User (actor, nullable for system events)
  │           │          └──< Notification >── User
  │           └── Client
  └──< RefreshToken
```

- **User** — `id, name, email (unique), passwordHash, role (ADMIN/PM/DEVELOPER)`.
- **Client** — `id, name`. A company the agency does work for.
- **Project** — belongs to one `Client`, created by one `User` (the owning PM/Admin).
  A PM's visible/editable projects are exactly `WHERE createdById = <their id>`.
- **Task** — belongs to one `Project`, optionally assigned to one `User`
  (Developer). Has `status`, `priority`, `dueDate`, `isOverdue`, and a `seq`
  (autoincrementing, human-facing `#12`-style number).
- **ActivityLog** — one row per state change, `projectId` + optional `taskId` +
  optional `userId` (null = system-generated, e.g. the overdue sweep) +
  `fromStatus`/`toStatus` + a pre-rendered `message`. This is the persisted source
  of truth the live feed and the "missed events" catch-up both read from.
- **Notification** — per-user, `type`, `message`, `read` flag, optional `taskId`.
- **RefreshToken** — stores a *hash* of each issued refresh token (never the raw
  token) plus `expiresAt`/`revokedAt`, so tokens can be rotated and revoked
  server-side on refresh/logout instead of only relying on JWT expiry.

**Indexes** (see `schema.prisma` comments for the reasoning next to each one):
`Task(projectId)`, `Task(assignedToId)`, `Task(status)`, `Task(projectId, status)`,
`Task(dueDate)`; `ActivityLog(projectId, createdAt)`; `Notification(userId, read)`,
`Notification(userId, createdAt)`; `Project(createdById)`, `Project(clientId)`.
Each one exists because a real query in the app filters or sorts on exactly that
column combination — listed in full under Technology_Decisions.md §3.



### 1. Database

You need a Postgres instance. Easiest local option (Docker):

```bash
docker run --name velozity-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=velozity -p 5432:5432 -d postgres:16
```

Or point `DATABASE_URL` at any Postgres you already have (local, Neon, Supabase, etc).

### 2. Backend

```bash
cd backend
cp .env.example .env      # then fill in DATABASE_URL and the two JWT secrets
npm install                # also runs `prisma generate` automatically
npx prisma migrate dev --name init
npm run seed                # creates demo users, clients, projects, tasks, activity
npm run dev                 # http://localhost:4000
```

> **Generate a JWT secret:** `openssl rand -base64 48` (run it twice — the access
> and refresh secrets must be different).

Seeded logins (all use password `Password123!`):

| Role      | Email               |
|-----------|---------------------|
| Admin     | admin@velozity.dev  |
| PM        | pm1@velozity.dev / pm2@velozity.dev |
| Developer | dev1@velozity.dev … dev4@velozity.dev |

### 3. Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_URL, defaults to http://localhost:4000
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173 and log in with any seeded account above.

## A note on this environment's build

This project was assembled and code-reviewed in a sandboxed build environment whose
network allowlist doesn't include `binaries.prisma.sh` (Prisma downloads its query
engine binary from there during `prisma generate`) or a live Postgres instance. That
means the backend could **not** actually be executed, migrated, seeded, or hit with
real requests during this build — only written and manually reviewed. On your own
machine, `npm install` reaches that domain normally and everything above should work
as described. If something doesn't, the likely culprits are: `.env` values not set,
Postgres not reachable at `DATABASE_URL`, or `prisma generate` not having run (it runs
automatically on `npm install`, but re-run `npx prisma generate` manually if types
look stale after pulling schema changes). Please treat the very first `npm run dev` as
a real first test, not a formality — I'd genuinely appreciate knowing if anything
doesn't come up cleanly.

## What needs to be connected to external services

Nothing above is wired to a live external service yet — all of it (`DATABASE_URL`,
JWT secrets, CORS origin, cron schedule) is a placeholder in `.env.example`. Before
this is a real, deployed, gradeable app, you need to connect:

1. **A real PostgreSQL database.** Easiest: a free instance on
   [Neon](https://neon.tech) or [Supabase](https://supabase.com) — copy its
   connection string into `backend/.env` → `DATABASE_URL`. Run
   `npx prisma migrate deploy && npm run seed` against it once.
2. **Backend hosting — NOT Vercel.** Per `Technology_Decisions.md` §7, the backend
   needs a long-running Node process (persistent Socket.io connections + an
   in-process cron timer), which Vercel's serverless functions can't provide.
   Deploy `backend/` to [Render](https://render.com) (or Railway/Fly.io) as a Web
   Service. Set its environment variables there: `DATABASE_URL`,
   `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN` (→ your Vercel frontend
   URL), `NODE_ENV=production`.
3. **Frontend hosting — Vercel**, as the brief specifies. Deploy `frontend/` there.
   Set its environment variable `VITE_API_URL` → your Render backend's URL.
4. **CORS + cookie domain wiring**, once both URLs above exist:
   - Backend `CORS_ORIGIN` must exactly match the deployed frontend origin.
   - The refresh-token cookie is already configured to be `SameSite=None; Secure`
     in production (see `backend/src/config/cookies.ts`), which is required
     specifically because frontend and backend end up on different domains — no
     action needed there beyond `NODE_ENV=production` being set.
5. **A GitHub repository**, if you haven't pushed this yet — both Render and Vercel
   deploy by connecting to a repo (`git push` triggers their auto-deploy), rather
   than a manual file upload.
6. **(Optional) A Redis instance** — only if you later swap node-cron for a real job
   queue (Bull/BullMQ), per the trade-off discussed in Technology_Decisions.md §4.
   Not needed for the current single-sweep-job design.

Nothing else needs a third-party connection — there's no email/SMS provider, no file
storage, and no external auth provider (JWT is self-issued) in this build.

## Architectural notes worth knowing before you review the code

- **Role enforcement is centralized**, not sprinkled per-route: every request under
  `/api/*` (except `/api/auth/*`) passes through `requireAuth` once in `app.ts`
  before it reaches any router, so there's no route that could accidentally skip it.
  `requireRole(...)` is then layered on top of specific write routes.
- **Every list/detail endpoint is scoped by role at the query level**
  (`src/utils/scope.ts`), not filtered after the fact — a Developer's Prisma query
  for tasks *is* `WHERE assignedToId = req.user.id`, not "fetch everything, then hide
  some of it in the response."
- **The activity log and notifications are always written to Postgres before being
  broadcast** over Socket.io (`src/utils/activity.ts`, `src/utils/notify.ts`) — the
  live feed and the "what did I miss while offline" REST catch-up
  (`GET /api/activity?since=<seq>`) are backed by the same source of truth.
- **`ActivityLog.seq` and `Task.seq`** are separate autoincrementing integers used
  for the missed-event cursor and the human-facing `#12` task numbers — UUIDs aren't
  chronologically sortable, so the catch-up query uses `seq`, not `id`.

## Known limitations (documented rather than hidden)

- **node-cron runs in-process** (Technology_Decisions.md §4): if this is ever scaled
  to multiple backend instances, the overdue sweep runs once per instance. The sweep
  is idempotent (it only ever touches tasks that aren't already flagged), so this is
  redundant work, not a correctness bug — but it's worth knowing before scaling out.
- **The Socket.io connection doesn't proactively refresh its auth token** before the
  15-minute access token expires; it reconnects and refreshes reactively on the next
  `connect_error` instead (see `frontend/src/context/SocketContext.tsx`). In practice
  this means a very briefly stale live connection right at the 15-minute mark, not a
  dropped session — the REST 401 → refresh flow keeps working regardless.
- **This build could not be run end-to-end** in the sandboxed environment that
  produced it (see "A note on this environment's build" above) — please run the
  local setup steps as a genuine first test.
