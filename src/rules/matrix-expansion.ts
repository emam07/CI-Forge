import type { Rule, RuleResult } from "./types";
import { rootJobName } from "./types";

export const matrixExpansionRule: Rule = async (ctx) => {
  const root = rootJobName(ctx.job.jobName);

  const prKeys = new Set(
    ctx.prJobs
      .filter((j) => rootJobName(j.jobName) === root && j.matrixKey != null)
      .map((j) => j.matrixKey as string)
  );

  const baselineKeys = new Set<string>();
  for (const wb of ctx.baselines) {
    for (const bj of wb.jobs) {
      if (rootJobName(bj.jobName) === root && bj.matrixKey != null) {
        baselineKeys.add(bj.matrixKey);
      }
    }
  }

  const newKeys = [...prKeys].filter((k) => !baselineKeys.has(k));
  if (newKeys.length === 0) return { matched: false, text: "" };

  const result: RuleResult = {
    matched: true,
    text: `matrix expanded: +${newKeys.length} combination${newKeys.length === 1 ? "" : "s"}`,
    evidence: newKeys.slice(0, 3).map((k) => `(${k})`).join(", "),
    confidence: 0.85
  };
  return result;
};
