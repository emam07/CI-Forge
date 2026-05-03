import type { Task } from "graphile-worker";
import { db } from "@/lib/db";
import { octokitForInstallation } from "@/lib/octokit";
import { computeWorkflowBaseline, type WorkflowBaseline } from "@/lib/baseline";
import { computeRegression, type PrJob } from "@/lib/delta";
import { renderComment, type AttributedJob } from "@/lib/comment";
import { postOrEditPrComment } from "@/lib/github-comment";
import { computeCostLine } from "@/lib/cost";
import { attribute } from "@/rules";
import type { ChangedFile, PrJobSnapshot } from "@/rules/types";
import { observe } from "@/observations";
import type { EvaluatePrPayload } from "@/lib/queue";

export const evaluatePrTask: Task = async (rawPayload, _helpers) => {
  const payload = rawPayload as EvaluatePrPayload;
  const { installationId, repoFullName, prNumber, headSha } = payload;
  const [owner, repoName] = repoFullName.split("/");

  const repo = await db.repo.findUnique({ where: { fullName: repoFullName } });
  if (!repo) {
    console.warn(`[evaluate-pr] repo not registered: ${repoFullName}`);
    return;
  }

  const octokit = await octokitForInstallation(installationId);

  const { data: pr } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    { owner, repo: repoName, pull_number: prNumber }
  );
  const baselineBranch = pr.base.ref;

  const allPrRuns = await db.workflowRun.findMany({
    where: { repoId: repo.id, headSha },
    include: { jobs: { include: { steps: true } } }
  });
  if (allPrRuns.length === 0) {
    console.warn(`[evaluate-pr] no PR runs found for ${repoFullName} sha=${headSha}`);
    return;
  }

  // Dedupe: a single head SHA can produce two workflow_runs (push + pull_request).
  // Keep one per workflow — prefer pull_request event, then highest attempt, then latest completedAt.
  const dedupedByWorkflow = new Map<string, (typeof allPrRuns)[number]>();
  for (const run of allPrRuns) {
    const key = run.workflowId.toString();
    const existing = dedupedByWorkflow.get(key);
    if (!existing) {
      dedupedByWorkflow.set(key, run);
      continue;
    }
    const prefersNew =
      (run.event === "pull_request" && existing.event !== "pull_request") ||
      (run.event === existing.event && run.attempt > existing.attempt) ||
      (run.event === existing.event &&
        run.attempt === existing.attempt &&
        (run.completedAt?.getTime() ?? 0) > (existing.completedAt?.getTime() ?? 0));
    if (prefersNew) dedupedByWorkflow.set(key, run);
  }
  const prRuns = [...dedupedByWorkflow.values()];

  const workflowIds = [...new Set(prRuns.map((r) => r.workflowId.toString()))];
  const baselines: WorkflowBaseline[] = [];
  for (const wid of workflowIds) {
    const sample = prRuns.find((r) => r.workflowId.toString() === wid)!;
    const wb = await computeWorkflowBaseline(
      repo.id,
      sample.workflowId,
      sample.workflowName,
      baselineBranch,
      sample.workflowHash
    );
    baselines.push(wb);
  }

  const prJobs: PrJob[] = [];
  const prJobSnapshots: PrJobSnapshot[] = [];
  for (const run of prRuns) {
    for (const job of run.jobs) {
      if (job.durationS == null) continue;
      prJobs.push({
        workflowId: run.workflowId,
        workflowName: run.workflowName,
        jobName: job.name,
        matrixKey: job.matrixKey,
        durationS: job.durationS,
        runnerLabel: job.runnerLabel
      });
      prJobSnapshots.push({
        workflowId: run.workflowId,
        workflowName: run.workflowName,
        jobName: job.name,
        matrixKey: job.matrixKey,
        durationS: job.durationS,
        runnerLabel: job.runnerLabel,
        steps: job.steps
          .sort((a, b) => a.number - b.number)
          .map((s) => ({ name: s.name, durationS: s.durationS }))
      });
    }
  }

  const result = computeRegression(prJobs, baselines);
  const reportedBranch = baselineBranch;

  let attributed: AttributedJob[] = [];
  let changedFiles: ChangedFile[] = [];
  const needsFiles = !result.warming || result.triggersAlert;

  if (needsFiles) {
    try {
      changedFiles = (await octokit.paginate(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
        { owner, repo: repoName, pull_number: prNumber, per_page: 100 }
      )) as unknown as ChangedFile[];
    } catch (err) {
      console.warn(`[evaluate-pr] PR files fetch failed`, err);
    }
  }

  if (result.triggersAlert && result.topRegressions.length > 0) {
    for (const job of result.topRegressions) {
      const causes = await attribute({
        octokit,
        owner,
        repo: repoName,
        prNumber,
        job,
        prJobs: prJobSnapshots,
        baselines,
        changedFiles
      });
      attributed.push({ job, causes });
    }
  }

  const observations = result.warming
    ? []
    : observe({ changedFiles, prJobs: prJobSnapshots });

  const cost = result.warming
    ? null
    : await computeCostLine({
        repoId: repo.id,
        defaultBranch: repo.defaultBranch,
        totalDeltaS: result.totalDeltaS
      });

  const body = renderComment({
    result: { ...result, baselineBranch: reportedBranch },
    attributed,
    observations,
    cost,
    baselineBranch: reportedBranch
  });

  await postOrEditPrComment({
    octokit,
    owner,
    repo: repoName,
    repoId: repo.id,
    prNumber,
    headSha,
    body
  });

  console.log(
    `[evaluate-pr] ${repoFullName}#${prNumber} sha=${headSha.slice(0, 7)} ` +
      `Δ=${result.totalDeltaS}s warming=${result.warming} alert=${result.triggersAlert}`
  );
};
