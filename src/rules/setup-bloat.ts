import type { Rule, RuleResult } from "./types";

const SETUP_PATTERN = /^(set up |checkout|setup|install|cache|restore cache|save cache|configure|login)/i;

export const setupBloatRule: Rule = async (ctx) => {
  const prJob = ctx.prJobs.find(
    (j) => j.jobName === ctx.job.jobName && j.matrixKey === ctx.job.matrixKey
  );
  if (!prJob || prJob.steps.length === 0) return { matched: false, text: "" };

  let setupS = 0;
  let workS = 0;
  for (const step of prJob.steps) {
    if (step.durationS == null) continue;
    if (SETUP_PATTERN.test(step.name)) setupS += step.durationS;
    else workS += step.durationS;
  }

  if (setupS < 5) return { matched: false, text: "" };
  if (setupS / Math.max(1, setupS + workS) < 0.5) return { matched: false, text: "" };
  if (ctx.job.deltaS < 10) return { matched: false, text: "" };

  const result: RuleResult = {
    matched: true,
    text: `setup overhead increased (${setupS}s of ${setupS + workS}s job time)`,
    evidence: `setup steps dominate this job's runtime`,
    confidence: 0.5
  };
  return result;
};
