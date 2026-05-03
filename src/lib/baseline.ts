import { db } from "./db";

export interface JobBaseline {
  jobName: string;
  matrixKey: string | null;
  medianS: number;
  iqrPct: number;
  count: number;
  lastRunnerLabel: string | null;
}

export interface WorkflowBaseline {
  workflowId: bigint;
  workflowName: string;
  workflowHash: string | null;
  baselineBranch: string;
  runCount: number;
  warming: boolean;
  windowSize: number;
  minRuns: number;
  jobs: JobBaseline[];
}

export const TARGET_BASELINE_WINDOW = 20;
export const MIN_BASELINE_RUNS = TARGET_BASELINE_WINDOW;

function median(sorted: number[]): number {
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function iqr(sorted: number[]): number {
  const n = sorted.length;
  if (n < 4) return 0;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  return q3 - q1;
}

export async function computeWorkflowBaseline(
  repoId: string,
  workflowId: bigint,
  workflowName: string,
  baselineBranch: string,
  workflowHash: string | null,
  windowSize: number = TARGET_BASELINE_WINDOW
): Promise<WorkflowBaseline> {
  const runs = workflowHash
    ? await db.workflowRun.findMany({
        where: {
          repoId,
          workflowId,
          workflowHash,
          headBranch: baselineBranch,
          conclusion: "success"
        },
        orderBy: { completedAt: "desc" },
        take: windowSize,
        include: { jobs: true }
      })
    : [];

  if (runs.length < MIN_BASELINE_RUNS) {
    return {
      workflowId,
      workflowName,
      workflowHash,
      baselineBranch,
      runCount: runs.length,
      warming: true,
      windowSize,
      minRuns: MIN_BASELINE_RUNS,
      jobs: []
    };
  }

  const buckets = new Map<
    string,
    { jobName: string; matrixKey: string | null; durations: number[]; lastRunner: string | null }
  >();

  for (const run of runs) {
    for (const job of run.jobs) {
      if (job.durationS == null || job.conclusion !== "success") continue;
      const key = `${job.name}::${job.matrixKey ?? ""}`;
      const bucket = buckets.get(key) ?? {
        jobName: job.name,
        matrixKey: job.matrixKey,
        durations: [],
        lastRunner: job.runnerLabel
      };
      bucket.durations.push(job.durationS);
      buckets.set(key, bucket);
    }
  }

  const jobs: JobBaseline[] = [];
  for (const bucket of buckets.values()) {
    if (bucket.durations.length < 3) continue;
    const sorted = [...bucket.durations].sort((a, b) => a - b);
    const med = median(sorted);
    const iqrV = iqr(sorted);
    jobs.push({
      jobName: bucket.jobName,
      matrixKey: bucket.matrixKey,
      medianS: med,
      iqrPct: med > 0 ? iqrV / med : 0,
      count: sorted.length,
      lastRunnerLabel: bucket.lastRunner
    });
  }

  return {
    workflowId,
    workflowName,
    workflowHash,
    baselineBranch,
    runCount: runs.length,
    warming: false,
    windowSize,
    minRuns: MIN_BASELINE_RUNS,
    jobs
  };
}
