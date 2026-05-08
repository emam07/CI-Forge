# CIForge — agent context

> Read this first. It's the briefing for a fresh Claude Code session so you don't have to re-derive the project from scratch.

## What this is

CIForge is a GitHub App that posts **one comment per pull request** describing how CI duration changed vs the `main` baseline, the likely cause, and the dollar impact. The comment is the entire product — no dashboard, no upload form. Positioning: neutral CI optimization auditor that sits above runner providers (Depot, Blacksmith, BuildJet).

The full pitch lives in `README.md` and `docs/THESIS.md`. Don't duplicate them — link to them when needed.

## Status

Shipped: Week 1 ingest pipeline (webhook → queue → worker hydrating GitHub run/job/step data into Postgres) **and** the regression engine (baseline, delta, ranked rule attribution, observations, comment formatter, post / edit-in-place). See `git log` — the most recent commit covers landing page + baseline + ranked attribution worker.

Cut line during notice period: **does this unblock a clickable demo URL?** Defer hardening, observability, polish until live. The deploy runbook in `docs/DEPLOY.md` is the path to that demo URL.

## Stack

- Node 20+ / TypeScript / Next.js 15 (App Router) / React 19
- Postgres 16 + Prisma 5
- `graphile-worker` for the queue (Postgres-backed, no Redis)
- `@octokit/app` + `@octokit/webhooks`
- Tailwind 3, vitest, tsx
- Deploy target: Fly.io (web + worker processes) + Supabase Postgres, region `bom`

## Repo layout

```
app/                     Next.js App Router
  page.tsx, layout.tsx, components/   landing page
  api/health/route.ts                 health check ({ ok: true })
  api/webhooks/github/route.ts        HMAC-verified webhook → enqueue ingest job
src/
  worker/index.ts                     graphile-worker entrypoint, concurrency=4
  worker/jobs/                        ingest-run, backfill, evaluate-pr
  rules/                              ranked-attribution rules (runner-change,
                                      matrix-expansion, dep-change, docker-cache-miss,
                                      new-test-files, setup-bloat) + index.ts orchestrator
  observations/                       static-rule observations (docs-only, runner-mismatch)
  lib/                                baseline, delta, comment formatter, github-comment poster,
                                      cost, db, env (zod-validated), octokit, queue,
                                      upsert helpers, workflow-hash
  scripts/backfill.ts                 backfill CLI
prisma/schema.prisma                  Installation, Repo, WorkflowRun, WorkflowJob,
                                      WorkflowStep, PrComment
prisma/migrations/                    init migration committed
docs/                                 THESIS, SPEC-MVP1, SETUP, MORNING, AFTERNOON,
                                      PRIMER, DEPLOY
Dockerfile, docker-entrypoint.sh      multi-stage; entrypoint switches on web/worker
fly.toml                              two processes, release_command runs prisma migrate deploy
```

## Commands

```
npm run dev          # Next.js on :3000
npm run worker       # graphile-worker (tsx, loads .env)
npm run backfill     # backfill CLI
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run db:push      # prisma db push (dev only — never against prod)
npm run db:generate  # prisma generate
npm run db:studio    # prisma studio
```

## Architecture (data flow)

```
GitHub webhook → app/api/webhooks/github/route.ts (HMAC verify)
  installation.created / installation_repositories.added → upsert Installation + Repo
  workflow_run.completed → enqueue ingest-run job (graphile-worker)
worker (src/worker/index.ts) picks up:
  ingest-run    → hydrate run/jobs/steps from GitHub API into Postgres
  backfill-repo → seed baseline from history
  evaluate-pr   → compute Δ vs baseline, run ranked attribution rules,
                  add static observations, format comment, post/edit via Octokit
```

Job key: `run:<runId>:<attempt>`, maxAttempts 5. Rules return `{ matched, text, confidence }`; `attribute()` sorts by confidence and returns top-N (default 3) with a fallback line if nothing matches.

## Environment

Required (validated via zod in `src/lib/env.ts`):

- `DATABASE_URL` — Postgres connection string. **Must be the direct connection (port 5432, session mode)**, not the Supabase pooler (6543) — `graphile-worker` needs `LISTEN`/`NOTIFY`. Add `?sslmode=require` for Supabase.
- `GITHUB_APP_ID` — `3552720` for the existing app
- `GITHUB_APP_PRIVATE_KEY` — full `.pem` contents; `\n` literals are auto-converted to newlines
- `GITHUB_APP_WEBHOOK_SECRET`
- Optional: `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET` (only if OAuth is configured)
- `PUBLIC_BASE_URL` — defaults to `http://localhost:3000`

Local dev uses `.env`; Fly uses `fly secrets`. `.env` is gitignored. `.env.example` is the canonical template.

## Local dev quickstart

```bash
docker run -d --name ciforge-pg \
  -e POSTGRES_USER=ciforge -e POSTGRES_PASSWORD=ciforge -e POSTGRES_DB=ciforge \
  -p 5433:5432 postgres:16
npm install
npm run db:generate && npm run db:push
# 3 terminals: dev / worker / smee proxy → /api/webhooks/github
```

Note: local Postgres maps to **5433** to avoid colliding with a host Postgres on 5432.

## Deploy (Fly.io + Supabase)

`docs/DEPLOY.md` is the runbook — follow it linearly. Key points:

- `fly launch --no-deploy --copy-config --name ciforge` (skip Fly Postgres/Redis)
- Set secrets via CLI; private key via dashboard (multi-line)
- `fly deploy` — `release_command = "npx prisma migrate deploy"` runs migrations against Supabase before machines boot
- Health: `curl https://ciforge.fly.dev/api/health` → `{"ok":true}`
- Repoint the GitHub App webhook URL to `https://ciforge.fly.dev/api/webhooks/github`, then redeliver a recent event

Gotchas: worker can't autostop (no HTTP service, runs continuously). Web cold-starts 1–3s after idle. Supabase free tier hibernates after a week of inactivity. Never run `prisma db push` against prod — the release_command does `migrate deploy`.

## Conventions and norms

- TypeScript with `"type": "module"`. Imports use `@/...` for `src/...` (see `tsconfig.json`).
- Rules and observers live in `src/rules/` and `src/observations/`. Adding one = new file + register in the corresponding `index.ts`. Each rule throws-safely (orchestrator catches and logs).
- Prisma models use `@@map("snake_case")`. `BigInt` for GitHub numeric IDs.
- Comments follow the principle in the user's CLAUDE.md memory: only WHY when non-obvious. Don't add narration.
- Worker concurrency 4, poll interval 2s.

## Things to verify before recommending from this file

This file describes state at the time of writing. If you're about to act on something here:

- `git log --oneline -20` to see what's actually shipped
- `git status` to see in-flight changes
- Read the file you're about to modify rather than trusting the layout above

## What lives where for cross-session continuity

- `README.md` — public-facing pitch and quickstart
- `docs/THESIS.md` — strategic positioning and competitive analysis
- `docs/SPEC-MVP1.md` — MVP-1 scope
- `docs/SETUP.md` / `docs/MORNING.md` / `docs/AFTERNOON.md` — local setup and verification runbooks
- `docs/DEPLOY.md` — production deploy runbook (Fly + Supabase)
- `docs/PRIMER.md` — domain primer
- This file (`CLAUDE.md`) — agent-only briefing; keep concise, link out instead of duplicating
