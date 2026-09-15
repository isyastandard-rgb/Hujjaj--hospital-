# Hujajj Hospital & Tech Hub — Full-Stack Deployment

A small full-stack app with authentication:

- **frontend/** — the site (HTML/CSS/JS, no build step). Talks to the API
  over `fetch` and gates patient records behind staff login.
- **backend/** — a Node/Express REST API: JWT-based login, hashed
  passwords, rate limiting, security headers, and centralized error
  handling.
- **PostgreSQL** — the database. Any managed Postgres works (Render,
  Railway, Supabase, Neon, AWS RDS) or run it yourself via Docker.

Patient records are shared server-side and only visible to signed-in
staff — no more localStorage-only, no more anonymous read/write access.

## What's new in this version

- **Login required.** Viewing, creating, and deleting patient records
  all require a valid staff session (JWT). Public pages (Services,
  Departments, hospital info) are unaffected.
- **No hardcoded credentials anywhere.** Accounts are created with an
  interactive CLI script (`npm run create-admin`), which prompts for a
  username/password and stores only a bcrypt hash.
- **Hardened API:** `helmet` security headers, request rate limiting
  (with a stricter limit specifically on the login endpoint to slow
  brute-force attempts), structured logging (`morgan`), input length
  limits, and a single centralized error handler that never leaks stack
  traces to clients.
- **Fail-fast startup:** the server refuses to start if `DATABASE_URL`
  or a strong `JWT_SECRET` aren't configured, instead of silently
  running insecurely.
- **Audit trail:** each record now stores which staff username created
  it (`created_by` in the database).

## Option A — Run everything locally with Docker (fastest way to try it)

Requires Docker + Docker Compose.

```bash
docker compose up --build
```

This starts Postgres (seeded from `backend/schema.sql`) and the API on
`http://localhost:4000`, using a development-only JWT secret already set
in `docker-compose.yml` (change it before deploying anywhere real).

Create your first login:

```bash
cd backend
npm install
npm run create-admin
```

Then open `frontend/index.html` in your browser, click **Staff Login**
top-right, and sign in with the account you just created.

## Option B — Deploy for real

### 1. Database (PostgreSQL)

Pick one: **Supabase**, **Neon**, **Railway**, or **Render** all offer a
managed Postgres instance and will give you a `DATABASE_URL` connection
string.

Run the schema once:

```bash
cd backend
cp .env.example .env
# paste your DATABASE_URL into .env, and set a real JWT_SECRET —
# generate one with: openssl rand -hex 32
npm install
npm run migrate
```

Then create your first account:

```bash
npm run create-admin
```

You'll be prompted for a username, password, and role (`staff` or
`admin`). Run this again any time you need to add another staff login
or reset a password.

### 2. Backend API

Deploy the `backend/` folder to any Node host (Railway, Render, Fly.io).
Set the start command to `npm start` and configure these environment
variables (see `backend/.env.example`):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Your Postgres connection string |
| `DATABASE_SSL` | `true` for managed Postgres (almost always required) |
| `JWT_SECRET` | Random string, 32+ characters — `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | How long a login lasts, e.g. `12h` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | Your frontend's URL once deployed (see step 4) |

Confirm it's alive: `https://<your-api-url>/api/health` should return
`{"ok":true,"db":"connected"}`.

### 3. Frontend

Update the config near the bottom of `frontend/index.html`:

```html
<script>
  window.HUJAJJ_API_BASE = 'https://<your-api-url>';
</script>
```

Deploy `frontend/` as a static site (Netlify, Vercel, GitHub Pages, or
any web host) — same as before, still zero build step.

### 4. Lock down CORS

Once both are live, set the backend's `CORS_ORIGIN` to your actual
frontend URL (not `*`) and redeploy the API.

## API reference

| Method | Path | Auth required? | Purpose |
|--------|------|-----------------|---------|
| GET    | `/api/health` | No | Check the API and DB are up |
| POST   | `/api/auth/login` | No | Exchange username/password for a JWT |
| GET    | `/api/auth/me` | Yes | Confirm a stored token is still valid |
| GET    | `/api/records?q=...` | Yes | List records, optional search by id/name |
| POST   | `/api/records` | Yes | Create a record |
| DELETE | `/api/records/:id` | Yes | Delete a record |

Authenticated requests need `Authorization: Bearer <token>`. Tokens come
from `/api/auth/login` and expire after `JWT_EXPIRES_IN` (default 12h).

Login request body:
```json
{ "username": "yourname", "password": "yourpassword" }
```

Record request body (POST):
```json
{
  "id": "HJJ-006",
  "name": "Sadiq Aliyu",
  "gender": "Male",
  "diagnosis": "Malaria",
  "test": "Malaria RDT",
  "result": "Positive",
  "treatment": "Artesunate 200mg",
  "remark": "Review in 5 days"
}
```

## Security notes & sensible next steps

- **Where the session token lives:** the frontend stores the JWT in
  `sessionStorage` (cleared when the tab closes), not `localStorage`.
  This is a reasonable default for a small internal tool, but a token
  in any browser storage is readable by JavaScript, which means it's
  exposed if the site ever has an XSS bug. For a production hospital
  system handling real patient data, the stronger pattern is an
  `httpOnly` cookie issued by the server instead — happy to switch it
  to that if you want the extra hardening.
- **Roles exist but aren't enforced yet.** `create-admin` lets you set a
  user's role to `admin` or `staff`, and the API middleware supports
  role checks (`requireRole`), but no route currently restricts by role
  — every signed-in user can do everything. Let me know if you want,
  say, deletion restricted to admins.
- **No password reset flow / no account lockout beyond rate limiting.**
  Fine for a small trusted staff list managed via `create-admin`; would
  need real user management (self-service reset, account disable, etc.)
  before opening this up to a larger organization.
- **Transport security:** always deploy the API behind HTTPS (every
  host listed above provides this automatically) — a JWT sent over
  plain HTTP can be intercepted.
