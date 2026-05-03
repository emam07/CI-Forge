import type { Rule, RuleResult } from "./types";

const TEST_PATTERNS = [
  /\.test\.[mc]?[tj]sx?$/,
  /\.spec\.[mc]?[tj]sx?$/,
  /(^|\/)__tests__\//,
  /(^|\/)tests?\//,
  /_test\.go$/,
  /test_.*\.py$/,
  /(^|\/)spec\//
];

const TEST_JOB_PATTERN = /test|spec|ci|jest|vitest|pytest|rspec|junit/i;

export const newTestFilesRule: Rule = async (ctx) => {
  if (!TEST_JOB_PATTERN.test(ctx.job.jobName)) return { matched: false, text: "" };

  const newTests = ctx.changedFiles.filter(
    (f) => f.status === "added" && TEST_PATTERNS.some((re) => re.test(f.filename))
  );
  if (newTests.length === 0) return { matched: false, text: "" };

  const result: RuleResult = {
    matched: true,
    text: `${newTests.length} new test file${newTests.length === 1 ? "" : "s"} added`,
    evidence: newTests.slice(0, 3).map((f) => f.filename).join(", "),
    confidence: 0.6
  };
  return result;
};
