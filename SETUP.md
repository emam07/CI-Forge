# CIForge — Local Setup (Week 1: Ingest)

This is the runbook for the Week 1 milestone from `SPEC-MVP1.md` §11: install on a real repo and see workflow runs flowing into Postgres.

## 0. Prerequisites

- Node.js 20+
- Postgres 16 running locally (or Docker: `docker run -d --name ciforge-pg -e POSTGRES_USER=ciforge -e POSTGRES_PASSWORD=ciforge -e POSTGRES_DB=ciforge -p 5432:5432 postgres:16`)
- A public tunnel for the webhook in dev — [smee.io](https://smee.io) is the simplest

## 1. Install deps

```bash
npm install
npm run db:generate
```

## 2. Create the GitHub App

1. Go to https://github.com/settings/apps/new (or your org's app settings)
2. **GitHub App name:** `CIForge (dev)` (must be globally unique — append your handle)
3. **Homepage URL:** `http://localhost:3000`
4. **Webhook URL:** your smee.io URL (e.g. `https://smee.io/abc123`)
5. **Webhook secret:** generate a strong random string — save it
6. **Permissions (Repository):**
   - Actions: **Read-only**
   - Contents: **Read-only**
   - Pull requests: **Read & write**
   - Metadata: **Read-only** (default)
7. **Subscribe to events:** `Pull request`, `Workflow run`, `Workflow job`, `Check suite`, `Installation`, `Installation repositories`
8. **Where can this app be installed?** Any account (or just yours, for dev)
9. After creating: generate and download a **private key** (.pem)
10. Note the **App ID** at the top of the settings page

## 3. Configure env

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` — your local Postgres URL
- `GITHUB_APP_ID` — from step 2.10
- `GITHUB_APP_WEBHOOK_SECRET` — from step 2.5
- `GITHUB_APP_PRIVATE_KEY` — paste the full `.pem` contents. If you put it on one line, replace newlines with `\n`. The loader handles both.

## 4. Initialize the database

```bash
npm run db:push
```

This creates the schema and graphile-worker's internal tables (the worker creates its own schema on first run).

## 5. Run the smee proxy (dev only)

In a dedicated terminal:

```bash
npx smee-client --url https://smee.io/abc123 --target http://localhost:3000/api/webhooks/github
```

## 6. Run the app

Three terminals:

```bash
# Terminal 1 — Next.js (webhook receiver + future UI)
npm run dev

# Terminal 2 — worker
npm run worker

# Terminal 3 — smee proxy (from step 5)
```

## 7. Install the App on a repo

1. Go to your GitHub App's public page (`https://github.com/apps/<your-app-name>`)
2. Click **Install** → choose a repo
3. Watch the smee terminal: you should see `installation` and `installation_repositories` events.
4. The Next.js terminal should log no errors. The worker is idle (no runs yet).

## 8. Backfill the last 30 days

You'll need the installation ID. Find it in the URL after installing (`/installations/<id>`) or via:

```bash
curl -H "Authorization: Bearer $(node -e "...")" https://api.github.com/app/installations
```

(Easier: just check the `installation.id` in the smee event JSON.)

```bash
npm run backfill <installation_id> <owner>/<repo> 30
```

This enqueues a `backfill-repo` job. The worker picks it up, paginates the last 30 days of completed runs, and enqueues an `ingest-run` job per run.

## 9. Verify

```bash
npm run db:studio
```

Open Prisma Studio. You should see rows in `workflow_run`, `workflow_job`, and `workflow_step`.

```sql
SELECT COUNT(*) FROM workflow_run;
SELECT name, AVG(duration_s) FROM workflow_job WHERE conclusion = 'success' GROUP BY name ORDER BY 2 DESC LIMIT 10;
```

That's the Week 1 exit criterion: **install on a real repo, see runs flowing in.**

## What's next (Week 2)

The regression engine: baseline computation, Δ vs PR head SHA, hypothesis rules, PR comment formatter, post/edit via GitHub API. See `SPEC-MVP1.md` §7 and §11.
