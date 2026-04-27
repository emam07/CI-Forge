# CIForge                                                                                                                                                     
   
  > The neutral CI optimization layer. Watches every pull request and tells you when CI got slower, why, and what it'll cost.                                   
                                                                     
  **Status:** Week 1 of 3 (ingest pipeline) shipped. Week 2 (the regression engine + PR comment — the actual product) is next.                                  
                                                                     
  ---                                                                                                                                                           
                                                                     
  ## What it is

  CIForge is a GitHub App that posts one comment on every pull request:                                                                                         
   
  > ⚠ **CI Δ +3m12s (+22%)** vs `main` baseline (median of last 20 runs)                                                                                        
  > - `test-integration` shard 4: **+1m40s** — likely cause: new dep `selenium-stealth` (added in `package-lock.json`)
  > - `web/Dockerfile` build: **+58s** — likely cause: cache miss starting at line 14 (`ARG BUILD_SHA` change invalidates layers below)                         
  > - `lint` ran on a docs-only change — last 100 docs-only PRs triggered it (consider a `paths-ignore`)                                                        
  >                                                                                                                                                             
  > _Estimated cost impact if merged: +$87/mo at this repo's current push frequency._                                                                           
                                                                                                                                                                
  That comment is the product. No dashboard, no executive PDF, no upload form. Just the artifact developers actually look at.
                                                                                                                                                                
  ## Why this exists                                                 
                                                                                                                                                                
  Free linters (`hadolint`, `actionlint`, `dive`) catch *static* CI inefficiencies. Faster-runner SaaS (Depot, Blacksmith, BuildJet) make every minute cheaper 
  but don't reduce *unnecessary* execution. Neither catches the class of waste that's only visible from observed runs:                                          
   
  - Dependency changes that silently inflate install time                                                                                                       
  - Docker `ARG` / `ENV` changes that invalidate layer caches                                                                                                   
  - Matrix shards where 80% of wall time is setup                                                                                                               
  - Workflows triggered by docs-only PRs                                                                                                                        
  - Jobs that *used to* take 3 min and now take 9                                                                                                               
  - Flaky tests masking real regressions                                                                                                                        
                                                                                                                                                                
  CIForge sits above the runners as the auditor. It can recommend Depot or Blacksmith when they're the right answer — and tell you not to spend money on them   
  when the real issue is workflow waste. **A runner provider can't credibly do that, because their P&L moves the wrong way.**                                   
                                                                     
  See [`THESIS.md`](./THESIS.md) for the full strategic write-up.                                                                                               
                                                                     
  ## How it works

  ```
  GitHub ──webhook──▶ Ingest API ──▶ Postgres                                                                                                                   
                         │
                         ▼                                                                                                                                      
                   Worker (queue)                                    
                         │                                                                                                                                      
                         ▼                                           
                Regression Engine ──▶ GitHub API (post / edit PR comment)
  ```                                                                                                                                                           
   
  | Component | Role |                                                                                                                                          
  |---|---|                                                          
  | **GitHub App** | Receives `pull_request`, `workflow_run`, `workflow_job`, `installation` webhooks |
  | **Ingest API** | Next.js route, HMAC-SHA256 verifies signature, enqueues job |                                                                              
  | **Worker** | `graphile-worker` task that hydrates run/jobs/steps from the GitHub API into Postgres |                                                        
  | **Regression Engine** _(Week 2)_ | Computes Δ vs baseline, runs hypothesis rules, formats the PR comment |                                                  
                                                                                                                                                                
  ## Status                                                                                                                                                     
                                                                                                                                                                
  | Milestone | What | State |                                                                                                                                  
  |---|---|---|
  | **Week 1** | Webhook ingest, queue, worker, baseline DB schema, backfill CLI | ✅ Shipped |                                                                 
  | **Week 2** | Regression engine, hypothesis rules, PR comment formatter, post / edit-in-place | 🚧 Next |                                                    
  | **Week 3** | Static observations (docs-only triggers, runner mismatch), cost line, design-partner installs | ⏳ |                                           
                                                                                                                                                                
  Verified locally: HMAC-tampered requests get rejected (400), valid `installation.created` and `workflow_run.completed` events create rows + queue jobs, the   
  worker picks them up.                                                                                                                                         
                                                                                                                                                                
  ## Quickstart                                                      

  Two paths depending on intent:                                                                                                                                
   
  - **Just want to see Week 1 ingest end-to-end against real GitHub?** Follow [`MORNING.md`](./MORNING.md) — 9 steps, ~20 minutes.                              
  - **Want the full setup walkthrough?** Follow [`SETUP.md`](./SETUP.md).
                                                                                                                                                                
  Quick local boot once `.env` is filled in:                                                                                                                    
                                                                                                                                                                
  ```bash                                                                                                                                                       
  docker run -d --name ciforge-pg \                                  
    -e POSTGRES_USER=ciforge -e POSTGRES_PASSWORD=ciforge -e POSTGRES_DB=ciforge \                                                                              
    -p 5433:5432 postgres:16                                                                                                                                    
  npm install                                                                                                                                                   
  npm run db:generate && npm run db:push                                                                                                                        
                                                                     
  # three terminals:                                                                                                                                            
  npm run dev          # Next.js on :3001                            
  npm run worker       # graphile-worker                                                                                                                        
  npx smee-client --url https://smee.io/<channel> --target http://localhost:3001/api/webhooks/github
  ```                                                                                                                                                           
                                                                     
  ## Stack                                                                                                                                                      
                                                                     
  - **Runtime:** Node.js 20+                                                                                                                                    
  - **Web / API:** Next.js 15 (App Router), TypeScript
  - **Database:** Postgres 16 + Prisma                                                                                                                          
  - **Queue:** `graphile-worker` (Postgres-backed — no Redis)                                                                                                   
  - **GitHub:** `@octokit/app` + `@octokit/webhooks`                                                                                                            
                                                                                                                                                                
  Single-language, single-database, single deployable. Every moving part not in the MVP is one we don't have to maintain when there are zero users.             
                                                                                                                                                                
  ## Project docs                                                                                                                                               
                                                                     
  | File | What it is |                                                                                                                                         
  |---|---|
  | [`THESIS.md`](./THESIS.md) | Honest pre-build assessment — competitive landscape, structural problems, recommended reframing. The "why." |                  
  | [`SPEC-MVP1.md`](./SPEC-MVP1.md) | The MVP-1 spec, scoped to the PR comment wedge. The "what." |                                                            
  | [`SETUP.md`](./SETUP.md) | Full local setup runbook. |                                                                                                      
  | [`MORNING.md`](./MORNING.md) | 9-step Week 1 verification against a real GitHub App. |                                                                      
                                                                                                                                                                
  ## Roadmap (post-MVP-1)                                                                                                                                       
                                                                                                                                                                
  These are explicitly **out of scope** for the first release and live as v2 candidates:                                                                        
                                                                     
  - Multi-repo dashboard                                                                                                                                        
  - Cost attribution by author / team / PR (chargeback CSV exports)  
  - Reusable-workflow inventory across an org                                                                                                                   
  - Matrix-shard efficiency view                                                                                                                                
  - Self-hosted runner support                                                                                                                                  
  - macOS / Windows runner specifics                                                                                                                            
  - Slack notifications, billing, custom rule config                                                                                                            
                                                                                                                                                                
  The order is driven by which design partners ask for what.                                                                                                    
                                                                                                                                                                
  ## Contributing                                                                                                                                               
                                                                     
  Not yet open to contributions — the API surface and rule pack are still in motion. Issues are welcome.                                                        
   
  ## License                                                                                                                                                    
                                                                     
  TBD — likely Apache-2.0 for the analyzer engine once it's extracted, with the hosted offering remaining proprietary.  
