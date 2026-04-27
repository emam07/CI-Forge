import type { Task } from "graphile-worker";
import { db } from "@/lib/db";
import { octokitForInstallation } from "@/lib/octokit";
import type { IngestRunPayload } from "@/lib/queue";

function parseMatrixKey(jobName: string): string | null {
  const m = jobName.match(/\(([^)]+)\)\s*$/);
  return m ? m[1].trim() : null;
}

function durationSeconds(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return null;
  return Math.round((e - s) / 1000);
}

export const ingestRunTask: Task = async (rawPayload, _helpers) => {
  const payload = rawPayload as IngestRunPayload;
  const { installationId, repoFullName, runId } = payload;
  const [owner, repoName] = repoFullName.split("/");

  const repo = await db.repo.findUnique({ where: { fullName: repoFullName } });
  if (!repo) {
    throw new Error(`Repo ${repoFullName} not registered — install webhook missed?`);
  }

  const octokit = await octokitForInstallation(installationId);

  const { data: run } = await octokit.request(
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}",
    { owner, repo: repoName, run_id: runId }
  );

  const totalDurationS = durationSeconds(run.run_started_at ?? run.created_at, run.updated_at);

  const dbRun = await db.workflowRun.upsert({
    where: { githubId: BigInt(run.id) },
    create: {
      repoId: repo.id,
      githubId: BigInt(run.id),
      workflowId: BigInt(run.workflow_id),
      workflowName: run.name ?? "unknown",
      headSha: run.head_sha,
      headBranch: run.head_branch ?? null,
      prNumber: run.pull_requests?.[0]?.number ?? null,
      event: run.event,
      status: run.status ?? "unknown",
      conclusion: run.conclusion ?? null,
      attempt: run.run_attempt ?? 1,
      startedAt: new Date(run.run_started_at ?? run.created_at),
      completedAt: run.updated_at ? new Date(run.updated_at) : null,
      totalDurationS,
      runnerLabel: null
    },
    update: {
      status: run.status ?? "unknown",
      conclusion: run.conclusion ?? null,
      attempt: run.run_attempt ?? 1,
      completedAt: run.updated_at ? new Date(run.updated_at) : null,
      totalDurationS,
      prNumber: run.pull_requests?.[0]?.number ?? null
    }
  });

  const jobs = await octokit.paginate(
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
    { owner, repo: repoName, run_id: runId, per_page: 100, filter: "latest" }
  );

  for (const job of jobs) {
    const jobDuration = durationSeconds(job.started_at, job.completed_at);
    const dbJob = await db.workflowJob.upsert({
      where: { githubId: BigInt(job.id) },
      create: {
        runId: dbRun.id,
        githubId: BigInt(job.id),
        name: job.name,
        matrixKey: parseMatrixKey(job.name),
        startedAt: new Date(job.started_at),
        completedAt: job.completed_at ? new Date(job.completed_at) : null,
        durationS: jobDuration,
        conclusion: job.conclusion ?? null,
        runnerLabel: job.runner_name ?? job.labels?.[0] ?? null,
        attempt: job.run_attempt ?? 1
      },
      update: {
        name: job.name,
        matrixKey: parseMatrixKey(job.name),
        completedAt: job.completed_at ? new Date(job.completed_at) : null,
        durationS: jobDuration,
        conclusion: job.conclusion ?? null,
        runnerLabel: job.runner_name ?? job.labels?.[0] ?? null,
        attempt: job.run_attempt ?? 1
      }
    });

    type Step = NonNullable<typeof job.steps>[number];
    if (job.steps && job.steps.length > 0) {
      await db.workflowStep.deleteMany({ where: { jobId: dbJob.id } });
      await db.workflowStep.createMany({
        data: job.steps.map((step: Step) => ({
          jobId: dbJob.id,
          name: step.name,
          number: step.number,
          durationS: durationSeconds(step.started_at, step.completed_at),
          conclusion: step.conclusion ?? null
        })),
        skipDuplicates: true
      });
    }
  }
};
