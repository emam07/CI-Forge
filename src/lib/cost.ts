import { db } from "./db";

const DEFAULT_PER_MINUTE_USD = 0.008;
const PUSH_FREQ_MIN = 1; // runs/day
const HISTORY_MIN_DAYS = 7;

export interface CostLine {
  shouldRender: boolean;
  monthlyDeltaUsd: number;
  pushFrequencyPerDay: number;
  perMinuteUsd: number;
  historyDays: number;
}

export async function computeCostLine(args: {
  repoId: string;
  defaultBranch: string;
  totalDeltaS: number;
  perMinuteUsdOverride?: number;
}): Promise<CostLine> {
  const { repoId, defaultBranch, totalDeltaS, perMinuteUsdOverride } = args;
  const perMinuteUsd = perMinuteUsdOverride ?? DEFAULT_PER_MINUTE_USD;

  const since = new Date(Date.now() - 30 * 86400 * 1000);
  const last30dRuns = await db.workflowRun.count({
    where: {
      repoId,
      headBranch: defaultBranch,
      conclusion: { in: ["success", "failure"] },
      completedAt: { gte: since }
    }
  });
  const pushFrequencyPerDay = last30dRuns / 30;

  const oldest = await db.workflowRun.findFirst({
    where: { repoId, headBranch: defaultBranch },
    orderBy: { completedAt: "asc" },
    select: { completedAt: true }
  });
  const historyDays = oldest?.completedAt
    ? Math.max(0, (Date.now() - oldest.completedAt.getTime()) / 86400000)
    : 0;

  const monthlyDeltaUsd =
    (totalDeltaS * pushFrequencyPerDay * 30 * perMinuteUsd) / 60;

  const shouldRender =
    historyDays >= HISTORY_MIN_DAYS && pushFrequencyPerDay >= PUSH_FREQ_MIN;

  return {
    shouldRender,
    monthlyDeltaUsd,
    pushFrequencyPerDay,
    perMinuteUsd,
    historyDays
  };
}
