import type { Rule, RuleResult } from "./types";

export const runnerChangeRule: Rule = async (ctx) => {
  const pr = ctx.job.prRunnerLabel;
  const base = ctx.job.baselineRunnerLabel;
  if (!pr || !base) return { matched: false, text: "" };
  if (pr === base) return { matched: false, text: "" };

  const result: RuleResult = {
    matched: true,
    text: `runner switched: \`${base}\` → \`${pr}\``,
    evidence: `previous baseline runner: ${base}; current PR runner: ${pr}`,
    confidence: 0.95
  };
  return result;
};
