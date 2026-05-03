import type { WorkflowBaseline, JobBaseline } from "./baseline";

export interface JobDelta {
  workflowId: bigint;
  workflowName: string;
  jobName: string;
  matrixKey: string | null;
  prDurationS: number;
  baselineMedianS: number;
  deltaS: number;
  deltaPct: number;
  significant: boolean;
  prRunnerLabel: string | null;
  baselineRunnerLabel: string | null;
  baselineCount: number;
}

export interface RegressionResult {
  baselineBranch: string;
  baselineRunCount: number;
  baselineWindowSize: number;
  baselineMinRuns: number;
  warming: boolean;
  workflowHashKnown: boolean;
  prTotalS: number;
  baselineTotalS: number;
  totalDeltaS: number;
  totalDeltaPct: number;
  triggersAlert: boolean;
  jobs: JobDelta[];
  topRegressions: JobDelta[];
}

const HEADLINE_DELTA_S = 30;
const HEADLINE_DELTA_PCT = 0.10;
const HEADLINE_DELTA_S_NOISY = 60;
const HEADLINE_DELTA_PCT_NOISY = 0.15;
const SURFACE_DELTA_S = 20;
const SURFACE_DELTA_PCT = 0.05;
const NOISY_IQR_RATIO = 0.5;

export interface PrJob {
  workflowId: bigint;
  workflowName: string;
  jobName: string;
  matrixKey: string | null;
  durationS: number | null;
  runnerLabel: string | null;
}

function findBaselineJob(
  baseline: WorkflowBaseline,
  jobName: string,
  matrixKey: string | null
): JobBaseline | null {
  return (
    baseline.jobs.find((j) => j.jobName === jobName && j.matrixKey === matrixKey) ?? null
  );
}

export function computeRegression(
  prJobs: PrJob[],
  baselines: WorkflowBaseline[]
): RegressionResult {
  if (baselines.length === 0) {
    return {
      baselineBranch: "",
      baselineRunCount: 0,
      baselineWindowSize: 20,
      baselineMinRuns: 20,
      warming: true,
      workflowHashKnown: false,
      prTotalS: 0,
      baselineTotalS: 0,
      totalDeltaS: 0,
      totalDeltaPct: 0,
      triggersAlert: false,
      jobs: [],
      topRegressions: []
    };
  }

  const baselineByWorkflow = new Map<string, WorkflowBaseline>();
  for (const b of baselines) baselineByWorkflow.set(b.workflowId.toString(), b);

  const allWarming = baselines.every((b) => b.warming);
  const baselineRunCount = Math.max(...baselines.map((b) => b.runCount));

  const deltas: JobDelta[] = [];
  let prTotalS = 0;
  let baselineTotalS = 0;

  for (const prJob of prJobs) {
    if (prJob.durationS == null) continue;
    prTotalS += prJob.durationS;

    const wb = baselineByWorkflow.get(prJob.workflowId.toString());
    if (!wb || wb.warming) continue;

    const bj = findBaselineJob(wb, prJob.jobName, prJob.matrixKey);
    if (!bj) continue;

    baselineTotalS += bj.medianS;
    const deltaS = prJob.durationS - bj.medianS;
    const deltaPct = bj.medianS > 0 ? deltaS / bj.medianS : 0;
    const surfaceFloor = Math.max(SURFACE_DELTA_S, bj.medianS * SURFACE_DELTA_PCT);
    const significant = Math.abs(deltaS) >= surfaceFloor;

    deltas.push({
      workflowId: prJob.workflowId,
      workflowName: prJob.workflowName,
      jobName: prJob.jobName,
      matrixKey: prJob.matrixKey,
      prDurationS: prJob.durationS,
      baselineMedianS: bj.medianS,
      deltaS,
      deltaPct,
      significant,
      prRunnerLabel: prJob.runnerLabel,
      baselineRunnerLabel: bj.lastRunnerLabel,
      baselineCount: bj.count
    });
  }

  const totalDeltaS = prTotalS - baselineTotalS;
  const totalDeltaPct = baselineTotalS > 0 ? totalDeltaS / baselineTotalS : 0;

  const noisyBaseline = baselines.some((b) =>
    b.jobs.some((j) => j.iqrPct > NOISY_IQR_RATIO)
  );
  const headlineDeltaS = noisyBaseline ? HEADLINE_DELTA_S_NOISY : HEADLINE_DELTA_S;
  const headlineDeltaPct = noisyBaseline ? HEADLINE_DELTA_PCT_NOISY : HEADLINE_DELTA_PCT;

  const triggersAlert =
    !allWarming &&
    Math.abs(totalDeltaS) >= headlineDeltaS &&
    Math.abs(totalDeltaPct) >= headlineDeltaPct;

  const topRegressions = deltas
    .filter((d) => d.significant && d.deltaS > 0)
    .sort((a, b) => b.deltaS - a.deltaS)
    .slice(0, 3);

  const windowSize = baselines[0]?.windowSize ?? 20;
  const minRuns = baselines[0]?.minRuns ?? 20;
  const workflowHashKnown = baselines.every((b) => b.workflowHash != null);

  return {
    baselineBranch: baselines[0]?.baselineBranch ?? "",
    baselineRunCount,
    baselineWindowSize: windowSize,
    baselineMinRuns: minRuns,
    warming: allWarming,
    workflowHashKnown,
    prTotalS,
    baselineTotalS,
    totalDeltaS,
    totalDeltaPct,
    triggersAlert,
    jobs: deltas,
    topRegressions
  };
}

export function formatDuration(seconds: number): string {
  const sign = seconds < 0 ? "-" : "+";
  const abs = Math.abs(Math.round(seconds));
  if (abs < 60) return `${sign}${abs}s`;
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  if (m < 60) return s ? `${sign}${m}m${s}s` : `${sign}${m}m`;
  const h = Math.floor(m / 60);
  const mr = m % 60;
  return mr ? `${sign}${h}h${mr}m` : `${sign}${h}h`;
}

export function formatPct(pct: number): string {
  const sign = pct < 0 ? "-" : "+";
  return `${sign}${Math.abs(Math.round(pct * 100))}%`;
}
