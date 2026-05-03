# CIForge — Thesis & Pre-Build Assessment

> Honest evaluation written before any implementation. The point of this document is to surface the strategic questions *before* writing code, not after.

---

## 1. The Problem (Is it real?)

**Yes — the underlying waste is real and measurable.**

- GitHub Actions minutes have a clear $/minute price for orgs over the free tier (~$0.008/min on Linux, ~$0.064/min on macOS).
- Median CI pipelines at small/mid companies routinely run 8–25 min per push. A team of 10 devs pushing ~30 times/day burns 4–12 hours of CI/day.
- A meaningful fraction of that time *is* avoidable: cache misses, serial jobs that could parallelize, full source copies that bust Docker layer cache, full test runs on docs-only changes.

So the "thing being detected" is real. The question is not *"does the waste exist?"* — it's *"will customers pay CIForge to detect it?"*

---

## 2. The Competitive Landscape (The hard part)

The spec doesn't engage with the existing market. It must.

### Free tools that overlap with CIForge today

| Tool | Covers | Cost |
|---|---|---|
| `hadolint` | Dockerfile lint (~60% of CIForge's Dockerfile rules) | Free, CLI |
| `actionlint` | GitHub Actions YAML lint | Free, CLI |
| `dive` | Docker image layer analysis | Free, CLI |
| `docker scout` | Dockerfile + image analysis | Free for individuals |

These already give engineers most of the *detection*. CIForge has to add something they don't: **business-readable reports, savings quantification, and a hosted experience.**

### Paid tools that solve the same pain differently

This is the bigger threat. Several companies sell "your CI is faster" as a *result*, not a *report*:

| Company | What they sell | Why it threatens CIForge |
|---|---|---|
| Depot | Faster Docker builds + GHA runners | One config change, 2–5× faster builds — no code edits required |
| Blacksmith | Drop-in faster GHA runners | Same: result, not advice |
| BuildJet | Faster GHA runners | Same |
| Namespace | Cloud build infra | Same |
| Ubicloud | Self-hosted cheap runners | 10× cheaper minutes |

**The structural problem:** if a buyer has a CI cost problem, they can either (a) read a CIForge report and refactor their pipeline, or (b) change one line in their workflow file and switch to Depot. Most buyers will pick (b). CIForge competes against the *easy* solution.

### What CIForge could do that they can't

- **Run-history-based cost attribution** — "this specific job costs you $X/month" is something a runner provider doesn't surface, because it would be self-incriminating.
- **Catch regressions at PR time** — runner providers don't tell you when a new commit *increased* CI time.
- **Cover Dockerfiles that aren't built in CI** — local dev builds, prod images.

These are real wedges. None of them are in the spec as written.

---

## 3. Three Structural Problems With the Spec

### Problem 1: Static cost estimation is not defensible

> "Estimated monthly saving: $500–$1,200"

This number is `(guessed minutes) × (guessed run frequency) × (assumed $/min)`. A skeptical engineering leader will not believe it. Worse — if they act on it and don't see the savings, you've lost trust permanently.

**Fix:** lead with **time saved per build**, which is defensible from static analysis. Only quote dollar figures when you have run-history data (Mode 2). The spec's Mode 1/Mode 2 split is correct; the issue is that the marketing copy in the spec leads with Mode 2 numbers built on Mode 1 evidence.

### Problem 2: One-time value, recurring price

The natural shape of CIForge's value is *one-shot*: scan, fix, done. SaaS pricing requires a recurring reason to pay.

**Fixes (need to pick one):**
- **PR-time integration** — every PR gets a CIForge comment. New regressions are caught. This is the strongest version but requires a GitHub App with permanent installation.
- **Ongoing cost dashboard** — pulls run history continuously, shows monthly trend, alerts on regressions.
- **Just sell the one-time scan** — $99 audit, no SaaS pretense. Honest but small market.

The current spec sits ambiguously between these. The MVP doesn't have to commit, but the *positioning* must.

### Problem 3: Who is the buyer?

The spec says "B2B developer tool" but doesn't name a buyer.

- **Individual devs?** They'll use the free tier and never upgrade.
- **DevOps / Platform engineers?** They mostly know these issues already and have mixed feelings about a tool telling them their pipeline is bad.
- **Eng managers / VPs?** Best buyer — they have the budget pain and don't have the visibility. But they also don't read Dockerfiles.

The product needs to choose. The current spec reads like it's built for DevOps engineers (technical findings, diff patches), but the *purchasing pain* lives with managers (cost, time-to-deploy).

A version that splits the report into a **"VP view"** (cost, trend, top-3 fixes, dollar impact) and an **"engineer view"** (rules, diffs, line numbers) would be much more sellable.

---

## 4. Verdict

| Dimension | Verdict |
|---|---|
| Technically buildable as specified | **Yes** — straightforward, ~2–4 weeks for a polished MVP |
| Provides real value to users | **Yes** — for teams that haven't already run hadolint/actionlint |
| Differentiated vs. free tools (hadolint, actionlint) | **Weak** unless we add hosted experience + savings quantification + PR integration |
| Differentiated vs. paid runners (Depot et al.) | **Weak** — they sell results, we sell reports |
| Worth building as a venture-scale SaaS | **Skeptical** without sharper positioning |
| Worth building as a portfolio project / open-source tool | **Strongly yes** — great scope, real engineering, demonstrable output |
| Worth building as a paid GitHub App with free tier + PR comments | **Yes, with effort** — this is the most viable commercial shape |

---

## 5. Recommended Reframing Before We Build

If we want to maximize the chance this becomes a real product:

1. **Reposition as "CI/CD cost observability" not "CI/CD analyzer."** The buyer is the person who pays the GitHub bill, not the person who writes the Dockerfile.
2. **Drop dollar amounts from MVP outputs.** Lead with *minutes saved per build* + *% of builds affected*. Add dollars only when run history is connected.
3. **Make the GitHub App the primary surface, not the upload form.** PR comments are the wedge. Manual upload is a demo affordance.
4. **Pick a single ICP for the MVP:** "CTO at a 20–100 engineer startup paying >$1k/month in GitHub Actions." Build the report for that person, not for the engineer running the build.
5. **Ship the analyzer engine as open source.** It's the credibility layer. Monetize the hosted dashboard + history + alerting.

---

## 6. Open Questions for You

Before I write any code, I need answers to these. Each one materially changes the architecture.

1. **Goal**: Is this a portfolio/learning project, an open-source tool, or a real commercial play? *(Affects how much we invest in landing pages, billing, auth.)*
2. **Buyer**: Are we building for the engineer or the engineering manager? *(Affects report format, copy, what we put in the executive summary.)*
3. **Surface**: Web upload first, or GitHub App first? *(Web upload is faster to ship; GitHub App is the actually-useful version.)*
4. **Cost claims**: Do we keep the dollar estimates in the MVP, or strip to time-only until we have run history? *(I recommend stripping. Confirm.)*
5. **Stack**: Spec says "Next.js or FastAPI." Pick one. I'd recommend **Next.js (App Router) + TypeScript + Postgres + Prisma** — single language, easier deploy, fewer moving parts for an MVP. Confirm or push back.
6. **Scope cuts**: I'd cut PDF export, dark mode, runner-cost configuration UI, and auth from MVP-1. Re-add when there's a paying user. Agree?

---

## 7. What I'd Actually Build for MVP-1 (My Counter-Proposal)

If you green-light a leaner first slice, I'd ship this in roughly this order:

**Week 1 — Analyzer engine (no UI)**
- Dockerfile parser + 8 rules (the spec's list)
- GHA workflow parser + 8 rules (the spec's list)
- JSON report output
- Unit tests per rule
- CLI: `ciforge analyze ./path` → prints findings

**Week 2 — Web app**
- Next.js app, single "upload files" page
- Run analyzer server-side
- Render report (executive summary, findings, diffs, copy buttons)
- Markdown export

**Week 3 — GitHub integration**
- "Paste a public repo URL" → fetch files via GitHub API → analyze
- (Defer GitHub App / OAuth to v2)

**Explicitly deferred to v2:**
- Run history / cost dollars
- GitHub App + PR comments
- Auth, multi-user, billing
- PDF export
- Custom rule config

This gets a usable, demoable product in ~2-3 weeks of focused work, with a clean engine we can build the commercial version on later.

---

## 8. Bottom Line

The spec describes a real problem and a buildable solution, but as written it's positioned to lose to free tools on the low end and to faster-runner companies on the high end. Build the engine, ship the demo, but **don't commit to the SaaS shape until we've answered the buyer + wedge questions above**.

I'd rather build a tight, honest MVP that we can pivot on than a polished product that's positioned wrong.
