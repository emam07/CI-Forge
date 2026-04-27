# Morning — Verify Week 1 with Real GitHub

~20 min. Goal: real `workflow_run` events flow into our DB.

---

## 1. Smee channel (public webhook URL)

Open https://smee.io → **Start a new channel** → copy the URL.

## 2. Webhook secret

```bash
openssl rand -hex 32
```

Save the output.

## 3. Create the GitHub App

Open https://github.com/settings/apps/new

| Field | Value |
|---|---|
| GitHub App name | `CIForge Dev <handle>` (must be globally unique) |
| Homepage URL | `http://localhost:3001` |
| Webhook URL | smee URL from step 1 |
| Webhook secret | from step 2 |

**Repository permissions:** Actions = Read · Contents = Read · Pull requests = Read & write

**Subscribe to events:** `Pull request`, `Workflow run`, `Workflow job`, `Installation`, `Installation repositories`

**Where can this app be installed:** Only on this account.

Click **Create GitHub App**. Then on the next page:
- Copy the **App ID** (shown at top)
- Scroll to **Private keys** → **Generate a private key** → a `.pem` downloads

## 4. Update `.env`

```bash
cd /root/CI-Forge
PEM=$(awk '{printf "%s\\n", $0}' ~/Downloads/<your-app>.*.private-key.pem)
echo "$PEM"   # sanity check — should be one long line ending in \n
```

Edit `.env` — replace these three lines:

```
GITHUB_APP_ID="<from step 3>"
GITHUB_APP_WEBHOOK_SECRET="<from step 2>"
GITHUB_APP_PRIVATE_KEY="<paste the $PEM value>"
```

## 5. Reset DB (clean slate)

```bash
docker start ciforge-pg
cd /root/CI-Forge
set -a && . .env && set +a
npx prisma db push --force-reset --accept-data-loss
```

## 6. Start everything (3 terminals)

```bash
# Terminal 1 — smee proxy (no install needed; npx fetches it)
npx smee-client --url <smee URL from step 1> --target http://localhost:3001/api/webhooks/github
```

```bash
# Terminal 2 — Next dev
cd /root/CI-Forge && set -a && . .env && set +a && PORT=3001 npx next dev -p 3001
```

```bash
# Terminal 3 — worker
cd /root/CI-Forge && set -a && . .env && set +a && npm run worker
```

## 7. Install the App on a repo

Open `https://github.com/apps/<your-app-name>` → **Install** → pick a repo that has Actions workflows.

Refresh http://localhost:3001 — `installations` should show `1`, `repos` should be `≥ 1`.

## 8. Trigger a real workflow

On the installed repo: push any commit, or re-run an existing workflow from the Actions tab.

## 9. Verify

Refresh http://localhost:3001 — `runs`, `jobs`, `steps` should all be `> 0`.

Or query:

```bash
docker exec ciforge-pg psql -U ciforge -d ciforge -c \
  "SELECT \"workflowName\", \"headBranch\", \"totalDurationS\", conclusion FROM workflow_run ORDER BY \"completedAt\" DESC LIMIT 5;"
```

If you see real workflow names + durations: **Week 1 verified.** ✅

---

## If something breaks

| Symptom | Likely cause |
|---|---|
| Server returns `400 invalid signature` | Webhook secret in `.env` doesn't match the App's secret |
| `200 OK` but no DB rows | Worker terminal isn't running |
| Worker logs `JSON web token could not be decoded` | Private key escaping wrong — redo step 4 with the `awk` recipe |
| Smee shows nothing | Smee channel URL doesn't match the GitHub App's webhook URL |
| `EADDRINUSE :3001` | Another process on 3001 — `pkill -f "next dev"` |
