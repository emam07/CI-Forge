# CIForge — Primer

> A ~1-hour read to understand what CIForge is, why it exists, how it works, and where it fits in the world.
>
> If `THESIS.md` is the strategic case and `SPEC-MVP1.md` is the implementation spec, **this is the learning document**. Read it first. The other two will make a lot more sense afterward.

---

## How to read this

Top to bottom. Each section builds on the previous one. By the end you should be able to:

1. Explain in 60 seconds what CIForge is to someone who's never heard of it.
2. Explain why it exists — what specific problem it's targeting.
3. Trace a webhook from GitHub through our system to the PR comment.
4. Explain the regression algorithm without looking it up.
5. Argue honestly about which parts are novel and which parts aren't.

If you can do those five things, you understand the project.

---

## 1. The 60-second pitch

CIForge is a GitHub App. When you open a pull request, your CI runs. CIForge measures how long it took compared to a rolling median of the last 20 runs on your base branch. If your PR makes CI meaningfully slower (or faster), CIForge posts **a single comment** on the PR that says:

- by how much (in seconds and percent)
- which jobs got slower
- the most likely cause for each (e.g. "new dep in `package-lock.json`", "matrix expanded from 3 → 6", "runner switched from `ubuntu-latest` to `macos-latest`")
- the estimated $/month cost if merged at the repo's current push frequency

That's it. One comment per PR, edited in place on every push. No dashboard, no settings page, no email digest, no flaky-test detector, no Slack notifications.

The bet: **catching CI rot at PR-time, in the PR itself, with a guess at the cause, is more useful than yet another dashboard nobody opens.**

---

## 2. The problem this solves

### 2.1 CI rot is a slow-motion disaster

Most engineering teams' CI runs at "8–25 minutes per push." Many teams started at 4–6 min and got there over 18 months without anyone making a single decision to be there. Each PR adds a small amount:

- A PR adds an `npm install` step. +30s.
- A new test file lands. +12s.
- A matrix gets expanded from 3 → 5 platforms because someone needed macOS once. +90s × 5 jobs.
- Someone copies a Dockerfile pattern that busts the cache. +2m on every build forever.

Each PR is "fine on its own." Six months later your team is waiting 12 minutes per push instead of 4. A 10-person team pushing 30×/day burns ~60 extra engineer-minutes per day → roughly 25 hours/month of waiting. Plus an extra ~$200–$1,000 of GitHub Actions billing.

The damage is real. The reason it persists is not that engineers don't care — it's that **the slowness is invisible at decision time**. Nobody reviewing the PR thinks "hmm, did this make CI slower?" because there is no signal in the PR review surface to make them think it.

### 2.2 Why this is structurally hard to fix without tooling

Even if a team is disciplined enough to care, the information is not available where the decision is made:

- GitHub shows you the duration of a single run, not its delta against history.
- Comparing "this run" against "median of last 20 on main" requires a database and a query.
- Knowing *why* a job got slower requires correlating PR diffs against job timings — which requires keeping the diff and the timings together.

So the data isn't there at the point of action. People notice 6 months later when the on-call complains, run a one-off audit, fix a few things, and the cycle starts over.

### 2.3 The cost in three numbers

For a 20-person team with median CI:

- **~25 engineer-hours/month** lost waiting (assume 30 pushes/day × 8 min wasted × 20 days)
- **~$300/month** in extra GitHub Actions billing for what could be saved
- **~1 cycle/quarter** of "CI is slow, someone fix it" interrupts that pull a senior engineer off feature work for 1–2 days

None of these is catastrophic on its own. Stacked, they're real money and real frustration. But **none of them is bad enough to make CI optimization a P0 project** for a team that has actual product work — which is exactly why the rot accumulates.

---

## 3. Why existing tools don't catch this

The act of measuring CI duration is not novel. The detection is well-trodden. The novelty is in *where* the signal appears.

### 3.1 What exists today

| Tool | What it does | Why it doesn't solve the problem |
|---|---|---|
| GitHub "Actions" tab | Shows duration per run | No baseline, no delta, you have to look |
| Datadog CI Visibility | Dashboards + traces | Dashboard is a different surface than the PR |
| Trunk Flaky Tests | Detects flaky tests | Different problem (correctness, not speed) |
| BuildPulse | Flaky tests | Same |
| Foresight (acq. Thundra) | APM-style CI tracing | Dashboard tool |
| CircleCI Insights | Dashboards | Only on CircleCI; dashboard surface |
| Buildkite Test Analytics | Dashboards | Dashboards |
| Depot / Blacksmith / BuildJet | Faster GHA runners | Sell "CI is faster," not "CI is slower than it used to be" |

These tools all share one of two flaws:

1. **Wrong surface.** Dashboards are a different surface than where the decision is made. A reviewer reviewing a PR will not click over to a CI dashboard. Will not get the email digest until 2 weeks later. Will not change behavior.
2. **Wrong problem.** Flaky-test detection is a saturated market. CI cost / duration regression is undertargeted.

### 3.2 The closest comparison: just-buy-faster-runners

Depot, Blacksmith, BuildJet all sell "switch one config line and your CI is 2–5× faster." This is the *strongest* competition because it's a product-shaped solution to the same pain.

The honest answer: CIForge and faster-runner products are **complementary, not substitutes.** Faster runners reduce baseline CI duration. CIForge tells you when *new code* is making CI slower. You'd want both. But for a buyer with $1000/month in CI costs and no time, "switch one line" beats "install our app and read comments." That's a real wedge problem.

### 3.3 Where CIForge actually sits

The narrow gap CIForge fills:

> "PR-time, GitHub-native, single-comment, cause-attributing CI regression detector."

That sentence has a lot of qualifiers. Each one is doing real work — drop any one of them and you're either (a) something that already exists, or (b) a worse version of it.

This is a **small niche**. Whether it's a venture-scale niche or a $300k-ARR niche is genuinely unknown. We're betting "real but small" — enough to justify building, not enough to justify telling everyone we'll be a unicorn.

---

## 4. The three design bets

Three opinionated calls that define the product:

### 4.1 PR-time, not dashboard-time

Feedback at decision-time changes behavior. Feedback after-the-fact does not. The whole product hinges on this. If you accept that engineers won't open a CI dashboard, you have to put the signal where they're already looking — the PR review surface.

The corollary: **we must be fast.** Comment latency target is < 30 seconds from `workflow_run.completed`. Slower than that and the reviewer has already merged.

### 4.2 Single comment, edited in place — never a thread

Engineers tolerate one comment per PR from a bot. They do not tolerate three. The comment is **identified by a hidden marker** (`<!-- ciforge:pr-comment v1 -->` — see `src/lib/comment.ts:6`) and re-fetched on every PR push. New push → fetch existing comment ID by marker → PATCH the existing comment with the new body. Never POST a second one.

This sounds trivial. It's actually load-bearing for the entire product. The moment we accidentally post two comments, the user thinks "this thing is noisy" and uninstalls.

### 4.3 Cause attribution, not just deltas

Showing "CI got 40s slower" is not actionable. Showing "CI got 40s slower **because the matrix expanded from 3 → 6**" is. The product is the second sentence, not the first.

Attribution is the part most likely to be wrong, and the part where being wrong is most expensive. We are conservative — we'd rather say "cause unknown — see run logs" than guess. (See `src/rules/index.ts` for the rule order; the fallback string is in there.)

---

## 5. What the comment actually looks like

This is from a real test on PR #1 of `emam07/CI-Forge` after we deliberately added `sleep 45` to the workflow:

```
⚠ CI Δ +40s (+500%) vs `main` baseline (median of last 6 runs)

- `greet`: +40s — likely cause: cause unknown — see run logs

CIForge · 1 workflow · 1 job compared
```

(The "cause unknown" is honest — we added a sleep, not a matrix change or dep change, so none of our rules match. Better to admit we don't know than guess.)

### 5.1 The four blocks

The comment has up to four blocks plus a footer. Order matters — most-decision-relevant first.

**Block A — Headline (1 line, always shown):**
The icon, absolute Δ, percent Δ, what we compared against, baseline window size.

| Icon | Meaning |
|---|---|
| ⚠ | Δ above headline thresholds, slowdown |
| 🟢 | Δ above headline thresholds, speedup |
| ✅ | Δ within noise — we still post so the comment is always there |
| 🟡 | Baseline still warming up (<5 baseline runs collected) |

We always post — even on `✅` runs. That's intentional. If we only commented on regressions, reviewers would wonder "did CIForge run? Is it broken?" The comment **is** the contract.

**Block B — Top 3 attributed contributors (bulleted, 0–3 lines):**
The 3 jobs with largest *positive* delta above the per-job significance threshold (`max(20s, 5% of baseline)`), each with a likely-cause string from the rule pack.

**Block C — Static observations (blockquoted, 0–2 lines):**
Things that are wrong but not regressions per se. MVP-1 has two:
- Heavy CI ran on a docs-only PR (suggest `paths-ignore`)
- macOS runner used for steps that don't need macOS (no `xcodebuild`/`pod`/`swift`/etc.)

**Block D — Cost line (italic, 1 line):**
`Estimated cost impact if merged: +$87/mo at this repo's current push frequency.`

Hidden if we don't have ≥7 days of history or pushes are <1/day on the default branch. Reasoning: with thin history the formula is unreliable, and quoting an unreliable dollar number is the fastest way to lose trust.

**Footer:**
`<sub>CIForge · N workflows · M jobs compared</sub>` — so the reader knows the scope.

### 5.2 Why "always edit in place" matters

Imagine pushing 10 commits to a PR. Without edit-in-place: 10 comments. The PR thread becomes unreadable. Reviewers hate the bot. Uninstall.

With edit-in-place: 1 comment, always reflecting the latest state. The reviewer can re-read it at any time and know it's current.

The implementation is in `src/lib/github-comment.ts`:
1. List PR comments.
2. Find the one whose body contains our marker.
3. If exists → `PATCH /repos/{owner}/{repo}/issues/comments/{id}` with the new body.
4. If not → `POST /repos/{owner}/{repo}/issues/{n}/comments`.
5. Cache the comment ID in our `pr_comment` table for fast lookup next time.

---

## 6. System architecture

### 6.1 The flow

```
GitHub ──webhook──▶ Next.js route handler ──▶ graphile-worker queue (Postgres)
                                                       │
                                                       ▼
                                              Worker process
                                                  │
                                  ┌───────────────┼───────────────┐
                                  ▼                               ▼
                           ingest-run task                 evaluate-pr task
                       (hydrate run+jobs+steps)        (compute Δ, post comment)
                                  │                               ▲
                                  └───────auto-enqueues──────────┘
```

What happens end-to-end:
1. **GitHub fires a webhook** on `workflow_run.completed`.
2. **Next.js route handler** at `src/app/api/webhooks/github/route.ts` verifies the HMAC signature and enqueues an `ingest-run` job.
3. **Worker** (separate process, `npm run worker`) picks up the job. The `ingest-run` task hydrates the full run + jobs + steps from the GitHub API, dedupes against existing rows, and writes to Postgres.
4. **`ingest-run` auto-enqueues** an `evaluate-pr` job for the PR head SHA, with a 30-second delay (so all workflows for that SHA have time to land).
5. **`evaluate-pr` task** fetches the PR, computes baselines per workflow, computes Δ, runs attribution rules and observations, computes the cost line, renders the Markdown, and posts/edits the comment via GitHub API.

The whole thing is one Next.js app + one worker process. Postgres for everything (data + queue). No Redis, no separate analytics DB.

### 6.2 Why this shape

- **Webhook-driven, not polling.** Polling is wasteful and slow. GitHub will tell us when something changed; we listen.
- **Queue between webhook and work.** The webhook handler must return 200 in <10s or GitHub retries. Real work takes longer (API hydration, comment rendering). A queue absorbs the asymmetry.
- **One worker process for everything.** Different job types (`ingest-run`, `evaluate-pr`, `backfill-repo`) all run in the same worker. Different workers add deploy complexity for no gain at MVP scale.
- **Postgres for the queue.** `graphile-worker` uses Postgres advisory locks. We get one DB to back up, one connection string to manage, one place to look when things break. Trade-off: less throughput than Redis. We will not approach that limit.

### 6.3 File map

| Path | What lives there |
|---|---|
| `src/app/api/webhooks/github/route.ts` | Webhook receiver. Signature verification, payload validation, job enqueue. |
| `src/lib/octokit.ts` | GitHub App authentication. Installation token caching. |
| `src/lib/queue.ts` | graphile-worker setup, job name + payload type definitions. |
| `src/worker/index.ts` | Worker entry point. Registers task handlers. |
| `src/worker/jobs/ingest-run.ts` | Hydrates a workflow run from GitHub API into Postgres. Auto-enqueues `evaluate-pr`. |
| `src/worker/jobs/evaluate-pr.ts` | The brain. Fetches PR, computes baselines, runs rules, posts comment. |
| `src/lib/baseline.ts` | Computes the median-of-last-20 baseline per workflow/job/matrix. |
| `src/lib/delta.ts` | Computes Δ vs baseline. Decides what's significant, what's noisy, what triggers an alert. |
| `src/rules/` | The 6 attribution rules + types + index. One file per rule. |
| `src/observations/` | The 2 static observers (docs-only, runner-mismatch). |
| `src/lib/cost.ts` | Block D cost line computation. |
| `src/lib/comment.ts` | Renders the Markdown comment from the regression result + attributions + observations + cost. |
| `src/lib/github-comment.ts` | Posts or edits the comment via GitHub API. Handles the marker-based "find existing" logic. |
| `prisma/schema.prisma` | Data model. |

---

## 7. The data model

Five tables, plus a join from `pr_comment` to repo. Everything is in `prisma/schema.prisma`.

```
installation         — one row per GitHub App install (org or user)
└── repo             — one row per repo we're tracking inside that install
    ├── workflow_run — one row per GitHub workflow run we've ingested
    │   └── workflow_job — one row per job inside a run
    │       └── workflow_step — one row per step inside a job
    └── pr_comment   — one row per (repo, pr_number); caches our comment ID for edit-in-place
```

Key fields and why they exist:

- **`workflow_run.head_sha`** — every PR push produces a new SHA; we group everything by SHA.
- **`workflow_run.head_branch`** — to find the baseline branch (PRs targeting `main` use `main`'s history).
- **`workflow_run.event`** — `push` vs `pull_request`. Both fire on a PR branch with an open PR. We dedupe in `evaluate-pr.ts:44–60`, preferring `pull_request` events.
- **`workflow_run.attempt`** — re-runs increment this. Use the latest.
- **`workflow_job.matrix_key`** — a hash of the matrix params (e.g. `os=ubuntu-latest,node=20`). Critical for shard-to-shard comparison: a 3-platform matrix has 3 jobs with the same `name` but different `matrix_key`s, and they have wildly different durations. You must compare each shard against its own baseline.
- **`workflow_job.runner_label`** — the `runs-on` label (e.g. `ubuntu-latest`, `macos-13`). We deliberately use the *static* label, not the assigned ephemeral runner name (e.g. `GitHub Actions 1000000007`), because the ephemeral name changes every run and would falsely trigger the "runner-change" rule.
- **`workflow_step.duration_s`** — needed for the `setup-bloat` rule, which compares "setup steps" duration vs "work steps" duration.

### 7.1 What we don't store

- PR diffs. We fetch them on demand from the GitHub API when a PR triggers an alert.
- Run logs. We never read them. Logs are gigabytes; metadata is kilobytes.
- User identities. We don't need them — comments are posted as the GitHub App, not as users.

---

## 8. The core algorithm — in detail

This is the heart of the product. Five steps:

### 8.1 Compute the baseline (`src/lib/baseline.ts`)

For a workflow `W` and a base branch `B`:

1. Pull last 20 successful runs of `W` on `B`.
2. For each `(job_name, matrix_key)` tuple, collect durations.
3. Sort and take the **median** (not the mean).
4. Compute IQR (Q3 − Q1) divided by median = `iqr_pct`. Used to flag noisy jobs.
5. If fewer than 5 runs exist: mark "warming up" and skip the alert.

**Why median, not mean?** CI duration distributions are heavy-tailed — a few runs hit cold caches, network blips, runner pool weirdness. Mean would constantly trigger false positives on flaky baselines. Median is robust to up to 50% outliers.

**Why per `(job_name, matrix_key)`?** A 3-platform matrix can have one shard at 30s and another at 4min. Comparing PR's "ubuntu shard" against baseline's "macos shard" would be nonsense.

**Why 20 runs?** Tradeoff: too few → noisy baseline; too many → slow to react to legitimate baseline shifts (e.g. when the team genuinely speeds up CI). 20 strikes the balance and matches what most CI tools converge on.

### 8.2 Compute the delta (`src/lib/delta.ts`)

For each PR job:
- `delta_s = pr_duration_s - baseline_median_s`
- `delta_pct = delta_s / baseline_median_s`
- **Significance** (per-job): `|delta_s| ≥ max(20s, 5% × baseline_median)`. We need both an absolute floor (so we don't surface 1s noise on tiny jobs) and a relative floor (so we don't bury a 5s slowdown on a 10s job).

Roll up: `total_delta_s = sum(pr_durations) − sum(baseline_medians)`.

### 8.3 Decide if it's an alert

The comment headline icon depends on whether the total Δ crosses the **headline threshold**:

| Condition | Threshold |
|---|---|
| Default | `|total_delta_s| ≥ 30s` AND `|total_delta_pct| ≥ 10%` |
| Noisy baseline (any job has `iqr_pct > 0.5`) | `|total_delta_s| ≥ 60s` AND `|total_delta_pct| ≥ 15%` |

Both conditions must hold (AND, not OR). This is the most important defense against false positives. A 30s slowdown on a 10-minute baseline is 5% — within noise, no alert. A 30% slowdown on a 100s baseline is 30s absolute — alert.

### 8.4 Attribute the top 3 (`src/rules/`)

Take the jobs with `delta_s > 0` and `significant == true`, sort by `delta_s` descending, take the top 3. For each, run rules in order; first match wins.

| Rule | Detects | Output |
|---|---|---|
| `runner-change` | Job's `runs-on` label changed since baseline | "runner switched: `ubuntu-latest` → `macos-13`" |
| `matrix-expansion` | More matrix combinations than baseline had | "matrix expanded: +K combinations" |
| `dep-change` | Lockfile (`package-lock.json`/`yarn.lock`/etc.) modified in PR diff AND a setup/install step's duration grew | "new/changed dep in `package-lock.json`" |
| `docker-cache-miss` | Dockerfile modified high in the file (above existing churn) AND a Docker build step's duration grew ≥30s | "cache miss starting at line N of `Dockerfile`" |
| `new-test-files` | PR adds files matching test globs AND a test job's duration grew | "K new test files added" |
| `setup-bloat` | Setup steps grew but work steps did not | "setup overhead increased (+Δs)" |
| _(fallback)_ | None of the above | "cause unknown — see run logs" |

**Why this order?** First match wins. We put highest-precision rules first:

- `runner-change` is unambiguous — the label literally changed.
- `matrix-expansion` is also unambiguous.
- `dep-change` is high-confidence when both signals fire.
- `setup-bloat` is the fuzziest — we ship it last so it doesn't shadow more specific causes.

If we put `setup-bloat` first, an actual `runner-change` would get attributed as "setup overhead increased" — technically true but uselessly vague.

**Why fall back to "cause unknown"?** Because attribution being *wrong* is much more expensive than attribution being *missing*. If we say "matrix expansion" and the user opens the PR and finds no matrix change, they don't trust us anymore. If we say "cause unknown — see run logs," they at least know we're being honest.

### 8.5 Static observations (`src/observations/`)

Two observers, max 2 lines, only shown if `!warming`:

- **`docs-only`**: Every changed file matches docs paths (`docs/`, `*.md`, `README*`, `CHANGELOG*`, `LICENSE*`, `.github/ISSUE_TEMPLATE/`, etc.) AND a heavy-named job (`test`, `build`, `lint`, `deploy`, `integration`, `e2e`) ran. Suggests adding `paths-ignore` to the workflow.
- **`runner-mismatch`**: Same workflow has both `^macos-` and `^ubuntu-` jobs AND the macOS jobs have no platform-specific steps (`xcodebuild`, `fastlane`, `pod`, `swift`, `swiftc`, `brew`, `otool`, `codesign`). macOS runners are 8× the cost of Linux — running them when nothing needs macOS is just burning money.

These are not regressions — they're "this is wrong but not new." We surface them anyway because Block C is cheap real estate and the suggestions are actionable.

### 8.6 Cost line (`src/lib/cost.ts`)

Formula:
```
push_freq_per_day = count(runs on default branch in last 30d) / 30
monthly_delta_usd = (total_delta_s × push_freq_per_day × 30 × $_per_minute) / 60
```

`$_per_minute` defaults to GitHub's published Linux rate ($0.008/min). The user can override in `.ciforge.yml` (deferred — not built yet).

**Hide the line if** `history_days < 7` OR `push_freq_per_day < 1`. Reason: the formula's denominator is `pushes/day`, and with thin history that number is too noisy to defend. Quoting an unreliable dollar amount is the fastest way to lose trust permanently.

Always say "estimated"; never "you will save."

---

## 9. Design decisions we made (and the alternatives we rejected)

### 9.1 PR comment vs Check Run

GitHub has two native PR surfaces: **comments** (in the conversation tab) and **check runs** (in the checks panel). Check runs are arguably more native — they appear as a status alongside CI itself. We chose comments because:

- Check runs are easy to ignore — reviewers don't always look at the panel.
- Comments require scrolling past — even if the reviewer skims, they see the icon.
- Comments support markdown blockquotes and tables; check runs are restricted.
- Check runs cap at 65kb of text; comments cap at 64kb but with richer formatting.

Trade-off: comments contribute to PR notification noise. Edit-in-place mitigates this almost entirely.

### 9.2 Median vs mean

Mean is more sensitive to large changes. Also more sensitive to outliers. CI distributions are heavy-tailed. Mean fails. Median wins.

### 9.3 Single-language stack

Next.js + TypeScript + Postgres + Prisma everywhere. Worker is also TypeScript via `graphile-worker`. No Redis, no Python service, no separate analytics DB. Reason: every moving part is one we have to maintain when we have zero users. Add complexity only when there's a paying user demanding it.

### 9.4 Postgres-backed queue, not Redis

`graphile-worker` uses Postgres advisory locks. One DB to back up, one connection string. Trade-off: less throughput than Redis. We will never approach that limit at MVP scale.

### 9.5 Why we always post a comment, even on ✅

If we only commented on regressions, reviewers would wonder "did CIForge run? Is it broken?" The comment is the contract — its presence proves we ran. The "✅ within noise" form is itself useful: it's evidence that nothing changed.

### 9.6 Why we don't detect flaky tests

Flaky tests are a different problem (correctness, not speed). Saturated market (Trunk, BuildPulse, etc.). We deliberately stay out.

### 9.7 Why we strip ephemeral runner names

GitHub assigns each job an ephemeral runner name like `GitHub Actions 1000000007`. This number changes every run. Our `runner-change` rule compares the current job's `runner_label` against the baseline's. If we used the ephemeral name, every run would falsely trigger the rule.

We use `job.labels[0]` (the `runs-on:` value, like `ubuntu-latest`). This is static and reflects the user's actual config choice. See `src/worker/jobs/ingest-run.ts` where we set `runnerLabel: job.labels?.[0] ?? null`.

### 9.8 Why we dedupe push + pull_request events

When a PR is opened, GitHub fires `workflow_run` for **both** the `push` event and the `pull_request` event on the same head SHA. Both succeed. Both get ingested. Without dedupe, we'd compare 2× the PR jobs against 1× the baseline and report a 100% slowdown.

`evaluate-pr.ts:44–60` dedupes by `workflow_id`, preferring `pull_request` event > higher `attempt` > later `completed_at`.

### 9.9 Why the cost line hides under thin history

`monthly_delta_usd` divides by `pushes/day` over 30 days. With <7 days of history, `pushes/day` is too noisy. Showing "+$87/mo" when the real number could be $9 or $400 destroys trust in one shot.

The rule: never show a number you can't defend. Hide instead.

---

## 10. What's hard about this product (and it's not the code)

The code is straightforward — most of it is GitHub API plumbing and a few statistical functions. The hard parts are upstream of the code.

### 10.1 False positive rate

If the comment fires "⚠ CI got slower" on a PR where the slowdown was a fluke, the engineer dismisses the comment. After 3 dismissals, they uninstall.

Defenses:
- Median (not mean) baseline
- Noisy-baseline widening (60s/15% if `iqr_pct > 0.5`)
- Per-job significance threshold (`max(20s, 5%)`)
- Both absolute AND relative thresholds (AND, not OR)

The unsolved problem: we don't yet know the false-positive rate empirically. We'll only know after 3+ design partners install on real repos with real PRs.

### 10.2 Attribution accuracy

Saying "matrix expansion" needs to be right. If the user opens the PR and finds no matrix change, trust evaporates.

Defenses:
- Conservative rules (specific signals required)
- "Cause unknown" fallback rather than guessing
- Each rule cites evidence (file path + line number, lockfile name, etc.)

### 10.3 Distribution

Even if the product is perfect, getting it in front of users is the actual hard problem. Strategies:
- Open-source the engine (credibility layer)
- Free GitHub App (zero-friction install)
- Personal network → dev-tools-Twitter → HN
- Aim for 10 design partners before charging anything

### 10.4 The GitHub-eats-this risk

GitHub could ship "PR comment with CI duration delta" as a built-in feature in a quarter if they wanted. They probably won't because it's a small market — but they could.

Defense: execution quality (better attribution, lower false positives) and being the obvious choice when teams want this. Niche tools survive in adjacent-to-platform markets all the time (Sentry survived built-in error reporting, Datadog survived CloudWatch, Vercel survived AWS Amplify).

---

## 11. What's built (status as of writing)

- **Week 1** — ingest pipeline: webhook → DB. Verified end-to-end on real GitHub events from `emam07/CI-Forge`. ✅
- **Week 2** — regression engine + comment. Posted real comment on PR #1 (`⚠ CI Δ +40s (+500%)`). Verified edit-in-place across multiple pushes. ✅
- **Week 3** — Block C observations + Block D cost line + push/pull_request dedup. Code complete and type-clean. Awaiting worker restart and re-verification on the same PR. 🚧

Deferred to v2 (deliberately): dashboard, login, multi-repo view, cost-by-author, Slack, finance exports, billing, `.ciforge.yml` parsing, install/landing page polish.

---

## 12. The honest competitive picture

| Type | Examples | Overlap | Differentiation |
|---|---|---|---|
| GitHub native | Actions tab | Shows duration; no Δ, no PR-time | We add baseline + Δ + comment |
| CI dashboards | Datadog CI Vis, Foresight, CircleCI Insights, Buildkite | Same data, dashboard surface | We're in the PR |
| Flaky-test tools | Trunk, BuildPulse | Different problem | N/A |
| Faster runners | Depot, Blacksmith, BuildJet, Namespace | Different approach (sell speed, not insight) | Complementary |
| Free CLI lints | hadolint, actionlint | Static-only; no run history | Different product shape |

**No direct competitor** today does exactly "PR comment with regression + cause attribution + cost." That's the wedge. Whether the wedge is venture-scale or lifestyle-scale is unknown.

The most likely 2-year outcomes, ranked by my honest probability estimate:

1. **(40%)** Useful internal tool + small open-source community. Maybe a few hundred installs. Cool portfolio. Not a business.
2. **(30%)** 5–20 paying customers at $50–$500/mo. Lifestyle product. Real but small.
3. **(20%)** GitHub ships a competing native feature; CIForge becomes irrelevant.
4. **(10%)** Genuinely takes off — multi-thousand installs, becomes the obvious pick, gets acquired by GitLab/Datadog/CircleCI/etc.

Build for case 2; hope for case 4; don't be surprised by case 3.

---

## 13. What "winning" looks like

Realistic 6-month ladder, in order:

1. **Comment-quality verified on our own repo.** Done for Week 2. Need Week 3 verification + a few more deliberate-regression PRs.
2. **3 design partners installed.** Their feedback dictates Week 4+.
3. **False-positive rate <5%.** Measured by: of all `⚠` comments posted, how many were dismissed by the PR author as noise.
4. **10 unpaid installs.** Distribution test.
5. **One team says "we'd pay for this."** Validates the niche is real.
6. **Charge them.** $50–$500/mo. Honest small revenue.

Failure modes, in order of likelihood:

- The comment is too noisy → engineers ignore → uninstall.
- Attribution is wrong often → trust evaporates → uninstall.
- Product works perfectly but distribution fails → no users.
- GitHub ships native equivalent → market disappears.

The biggest risk is distribution, not code. The code is the smallest part of winning.

---

## 14. Glossary

- **Baseline** — median duration of last 20 successful runs of the same workflow on the PR's base branch.
- **Δ (delta)** — PR duration minus baseline duration.
- **Headline threshold** — the absolute and relative Δ that triggers the ⚠ icon (default: ≥30s AND ≥10%; widens to ≥60s AND ≥15% if baseline is noisy).
- **Surface threshold** — the per-job Δ significant enough to mention in Block B (`max(20s, 5% × baseline)`).
- **Noisy baseline** — a baseline where any job has `IQR / median > 0.5`. Triggers wider thresholds.
- **Warming up** — fewer than 5 baseline runs available; we mark the comment 🟡 and skip the alert.
- **Matrix key** — a hash identifying a specific (os, node-version, etc.) combination so we compare shards correctly across runs.
- **Edit-in-place** — we keep one comment per PR and PATCH it on every push instead of posting a new one. Identified by a hidden marker in the comment body.
- **Attribution** — the rule-based guess at *why* a job got slower, output of `src/rules/`.
- **Observation** — a static finding that's not a regression but worth flagging (docs-only running heavy CI, runner mismatch). Output of `src/observations/`.
- **Push frequency** — runs/day on default branch, used to scale the cost line.

---

## 15. The 60-second pitch, again — now with context

CIForge is a GitHub App that posts a single PR comment when your PR makes CI meaningfully slower (or faster). It compares against a 20-run median baseline on the base branch, attributes the slowdown to a likely cause (runner change, matrix expansion, dep change, docker cache miss, new tests, setup bloat), surfaces 0–2 static observations (docs-only-on-heavy-CI, runner mismatch), and estimates the monthly cost impact.

The bet is that **PR-time signal beats dashboard signal**, that **single-comment discipline beats notification-spam**, and that **cause attribution beats raw deltas**. The alternative tools either show data in the wrong surface (dashboards) or solve a different problem (flaky tests, faster runners).

It's a small but real wedge. The code is mostly straightforward. The hard part is execution quality: false-positive rate, attribution accuracy, and distribution.

We've built Weeks 1–3. Week 4+ is design partners and tuning thresholds against real false-positive data we don't yet have.

Read `THESIS.md` next for the strategic case, then `SPEC-MVP1.md` for the implementation contract.
