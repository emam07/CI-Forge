# Afternoon — Verify Week 2 (Regression Engine + PR Comment)

~30 min. Goal: a real PR on `emam07/CI-Forge` gets a CIForge comment with the right Δ + attribution.

Assumes morning steps are done (App installed, smee/Next/worker all running, `installations: 1, repos: 1, runs: ≥1` on the dashboard).

---

## 1. Restart the worker (loads new tasks)

Terminal 3:

```bash
# Ctrl+C the running worker, then:
cd /root/CI-Forge && set -a && . .env && set +a && npm run worker
```

Confirm the connect line lists **three** tasks:

```
task names: 'ingest-run', 'backfill-repo', 'evaluate-pr'
```

Smee + Next dev (Terminals 1 & 2) keep running unchanged.

## 2. Sanity-check the dashboard

Open http://localhost:3002 — counts from morning are still there.

## 3. Warm up the baseline (5 runs on `main`)

Spec §7.1: minimum 5 successful runs on the base branch before regression can compute. We have 1 from this morning. Need 4 more.

Cheapest way: push 4 trivial commits to `main` via the GitHub UI.

1. https://github.com/emam07/CI-Forge → click any file (e.g. `MORNING.md`)
2. Pencil icon → add a single space at end → **Commit changes** to `main`
3. Repeat 4× total

After each commit, the `hello` workflow runs (~20s). You can do them back-to-back; GitHub queues them.

After all 4 finish (Actions tab green ✓), confirm:

```bash
docker exec ciforge-pg psql -U ciforge -d ciforge -c \
  "SELECT count(*) FROM workflow_run WHERE conclusion = 'success' AND \"headBranch\" = 'main';"
```

Should be `≥ 5`.

## 4. Open a deliberate-regression PR

Goal: a PR whose `hello` workflow takes noticeably longer than baseline. Baseline median is ~18s, so we need PR runtime ≥ 48s (Δ ≥ 30s AND ≥ 10%) to trigger the ⚠ headline.

On GitHub:

1. https://github.com/emam07/CI-Forge → branch dropdown → **View all branches** → **New branch** → name it `slow-ci-test`
2. On the new branch, edit `.github/workflows/hello.yml`
3. Change `sleep 5` to `sleep 45`
4. Commit to `slow-ci-test`
5. Click **Compare & pull request** → **Create pull request**

The push to `slow-ci-test` triggers the workflow on the PR head SHA. Wait ~60s for it to finish.

## 5. Watch the comment land

Three things happen in order, ~30s apart:

| Where | What you should see |
|---|---|
| Smee terminal | `POST … - 200` for `pull_request.opened` and `workflow_run.completed` |
| Next dev terminal | `POST /api/webhooks/github 200` for the same |
| Worker terminal | `[evaluate-pr] emam07/CI-Forge#<N> sha=<7> Δ=<seconds>s warming=false alert=true` |
| The PR | A CIForge comment posted by the bot |

The comment should be the ⚠ form:

```
⚠ CI Δ +40s (+222%) vs `main` baseline (median of last 5 runs)
- `greet`: +40s — likely cause: cause unknown — see run logs
```

(Attribution is `cause unknown` because we didn't change a lockfile/Dockerfile/etc — just a `sleep` value. That's correct — it's a deliberately weak signal so attribution falls through to fallback.)

## 6. Verify edit-in-place on force-push

Push another commit to `slow-ci-test` (e.g. change `sleep 45` to `sleep 50`). The same comment should be **edited**, not duplicated. Check the PR — only one CIForge comment, with updated numbers.

```bash
docker exec ciforge-pg psql -U ciforge -d ciforge -c \
  "SELECT \"prNumber\", \"githubCommentId\", \"lastHeadSha\", \"updatedAt\" FROM pr_comment;"
```

Should be one row, `updatedAt` newer than `postedAt`.

## 7. (Optional) Verify rule attribution

Add a commit to `slow-ci-test` that touches a lockfile:

```
echo "// regression test" >> package-lock.json
```

(Commit via GitHub UI: open `package-lock.json`, append a comment line.)

Next comment should now read:
> likely cause: new/changed dep in `package-lock.json`

That proves the `dep-change` rule is wired.

## 8. Done — Week 2 verified

If you got the ⚠ comment AND the edit-in-place AND (optionally) one rule attribution — Week 2 exit criterion per `SPEC-MVP1.md` §11 is met.

---

## If something breaks

| Symptom | Likely cause |
|---|---|
| Comment never appears | Worker isn't running or didn't restart after Week 2 code; check Terminal 3 |
| Worker logs `evaluate-pr` errored on `pull_request not found` | The App's `Pull request` event isn't subscribed — fix in App settings |
| Worker logs `evaluate-pr` ran with `warming=true` | Fewer than 5 baseline runs; do step 3 |
| `Δ=0s warming=false alert=false` | Job duration didn't actually change — check the workflow file diff |
| Multiple comments instead of one | `pr_comment` row missing — check `repoId_prNumber` unique constraint exists in DB |
| Worker silent after PR push | `evaluate-pr` debounces 30s — wait |
| Comment posted but missing the ⚠ headline | Δ didn't cross both thresholds (≥30s **AND** ≥10%) — make the slowdown bigger |
